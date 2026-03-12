import type { Lucid } from "@lucid-evolution/lucid";
import {UTxO, Data, mintingPolicyToId, validatorToAddress, toUnit, fromText,getAddressDetails,toHex} from "@lucid-evolution/lucid";
import { getNftPolicy, getMultisigStateValidator, getVaultValidator } from "./contract";
import { encodeMultisigDatum, encodeVaultRedeemer } from "./datum";
import { MultisigDatum, VaultState } from "./types";

const NFT_ASSET_NAME_STRING = "VaultStateNFT";

export async function setupVaultSystem(
    lucid:Awaited<ReturnType<typeof Lucid>>,
    params: {
        signerAddresses: string[];
        threshold: number;
        network: "Preprod";
    }
) {
    try {
        const {signerAddresses, threshold, network} = params;
        
        console.log("1. Getting seed UTXO...");
        const [seedUtxo] = await lucid.wallet().getUtxos();
        if(!seedUtxo) throw new Error("No Utxos found in wallet");
        console.log("   Seed UTXO:", seedUtxo.txHash, seedUtxo.outputIndex);

        console.log("2. Creating NFT policy...");
        const nftPolicy = getNftPolicy({
            txHash: seedUtxo.txHash,
            outputIndex: seedUtxo.outputIndex,
        });
        const nftPolicyId = mintingPolicyToId(nftPolicy);
        const nftUnit = toUnit(nftPolicyId,fromText(NFT_ASSET_NAME_STRING));
        console.log("   NFT Policy ID:", nftPolicyId);
        console.log("   NFT Unit:", nftUnit);

        console.log("3. Extracting signer PKHs...");
        const signerPKHs = signerAddresses.map((addr) => {
            const details = getAddressDetails(addr);
            if(!details.paymentCredential)
                throw new Error(`Can't extract PKH from address: ${addr}`);
            return details.paymentCredential.hash;
        });
        console.log("   Signer PKHs:", signerPKHs);

        console.log("4. Creating state validator...");
        const stateValidator = getMultisigStateValidator(nftPolicyId, NFT_ASSET_NAME_STRING);
        const stateAddress = validatorToAddress(network, stateValidator);
        console.log("   State address:", stateAddress);

        console.log("5. Encoding datum...");
        const initialDatum = encodeMultisigDatum({
            signers: signerPKHs,
            threshold,
        });
        console.log("   Datum encoded:", initialDatum);

        console.log("6. Building transaction...");
        const tx = await lucid
            .newTx()
            .collectFrom([seedUtxo])
            .mintAssets({ [nftUnit]: BigInt(1) }, Data.void())
            .pay.ToContract(
                stateAddress,
                { kind: "inline", value: initialDatum },
                { lovelace: BigInt(2_000_000), [nftUnit]: BigInt(1) }
            )
            .attach.MintingPolicy(nftPolicy)
            .complete();
        
        console.log("7. Signing transaction...");
        const signed = await tx.sign.withWallet().complete();
        
        console.log("8. Submitting transaction...");
        const txHash = await signed.submit();
        console.log("   TX Hash:", txHash);

        return {txHash, nftPolicyId, stateAddress};
    } catch (error: any) {
        console.error("Setup error at step:", error);
        console.error("Error details:", error.message);
        console.error("Error stack:", error.stack);
        throw new Error(`Setup failed: ${error.message}`);
    }
}

//put ada onto vault
export async function depositToVault(
    lucid: Awaited<ReturnType<typeof Lucid>>,
    params: {nftPolicyId: string; amount: bigint; network: "Preprod"}
) {
    const {nftPolicyId, amount, network} = params;
    const vaultValidator = getVaultValidator(nftPolicyId, NFT_ASSET_NAME_STRING);
    const vaultAddress = validatorToAddress(network, vaultValidator);

    const tx = await lucid.newTx().pay.ToContract(
        vaultAddress,
        {kind: "inline", value: Data.void()},
        {lovelace: amount}
    )
    .complete();
    const signed = await tx.sign.withWallet().complete();
    return await signed.submit();
}

/* Build the spend tx (first signer initiates) 
Returns unsigned tx CBOR to be shared with other signers */
export async function buildSpendTx (
    lucid: Awaited<ReturnType<typeof Lucid>>,
   params: {
    nftPolicyId: string;
    stateUtxo: UTxO;
    vaultUtxos: UTxO[];
    datum: MultisigDatum;
    recipient: string;
    amount: bigint;
    network: "Mainnet" | "Preprod";
    signingPkhs: string[];
  }
): Promise<string> {
    const {nftPolicyId,stateUtxo,vaultUtxos,datum,recipient,amount,network,signingPkhs}=params;
    // const stateValidator = getMultisigStateValidator(nftPolicyId,);
    const vaultValidator = getVaultValidator(nftPolicyId,NFT_ASSET_NAME_STRING);
    console.log("nftPolicyId:", nftPolicyId);
    console.log("NFT_ASSET_NAME_STRING:", NFT_ASSET_NAME_STRING);
    console.log("signingPkhs:", signingPkhs);
    console.log("datum.signers:", datum.signers);
    console.log("datum.threshold:", datum.threshold);
    const allAreSigners = signingPkhs.every(pkh => datum.signers.includes(pkh));
    console.log("all_are_signers check:", allAreSigners);
    signingPkhs.forEach(pkh => {
        console.log(`  pkh ${pkh} in signers? ${datum.signers.includes(pkh)}`);
    });

    //  threshold met?
    console.log("threshold_met check:", signingPkhs.length, ">=", datum.threshold, "=", signingPkhs.length >= datum.threshold);

    // state UTxO has NFT?
    const { toUnit, fromText } = await import("@lucid-evolution/lucid");
    const nftUnit = toUnit(nftPolicyId, fromText(NFT_ASSET_NAME_STRING));
    console.log("nftUnit:", nftUnit);
    console.log("stateUtxo.assets:", stateUtxo.assets);
    console.log("stateUtxo has NFT?", !!stateUtxo.assets[nftUnit]);
    console.log("stateUtxo.datum:", stateUtxo.datum);
    console.log("stateUtxo.txHash:", stateUtxo.txHash);
    console.log("vaultUtxos count:", vaultUtxos.length);

    

    const redeemer = encodeVaultRedeemer(signingPkhs);
    console.log("redeemer CBOR:", redeemer);
    const totalVault = vaultUtxos.reduce(
        (s,u) => s+(u.assets.lovelace?? BigInt(0)),
                    BigInt(0)     
    );
    const change = totalVault - amount;
    /*State UTxO is a REFERENCE input — read-only, not consumed
     Consume vault UTxOs with vault redeemer carrying signatures
     Pay recipient the requested amount */
    let txBuilder = lucid.
        newTx().
        readFrom([stateUtxo]).
        collectFrom(vaultUtxos,redeemer)
        .pay.ToAddress(recipient,{lovelace: amount}).
        attach.SpendingValidator(vaultValidator);
    
    for (const pkh of signingPkhs) {
        txBuilder = txBuilder.addSignerKey(pkh); // use PKH directly, not address
    }
    
    // //add required sogners 
    // const walletAddress = await lucid.wallet().address();
    // // const {paymentCredential}=getAddressDetails(walletAddress);
    // const { paymentCredential } = getAddressDetails(walletAddress);
    // if (paymentCredential) {
    //     txBuilder = txBuilder.addSignerKey(paymentCredential.hash);
    // }

    // Return leftover to vault if meaningful amount remains
   const vaultAddress = validatorToAddress(network, vaultValidator);
   if (change > BigInt(2_000_000)) {
    txBuilder = txBuilder.pay.ToContract(
      vaultAddress,
      { kind: "inline", value: Data.void() },
      { lovelace: change }
    );
  }
  const tx = await txBuilder.complete();
  return tx.toCBOR();
    
}

//Sign a tx CBOR (each co-signer calls this)
export async function signTxCbor(
    lucid: Awaited<ReturnType<typeof Lucid>>,
    txCbor: string
) : Promise<string> {
    const tx = lucid.fromTx(txCbor);
    const signed= await tx.sign.withWallet().complete();
    return signed.toCBOR();
}

//Combine signatures and submit
export async function submitSignedTx(
    lucid: Awaited<ReturnType<typeof Lucid>>,
    txCbor: string
): Promise<string> {
    const tx = lucid.fromTx(txCbor);
    const signed= await tx.sign.withWallet().complete();
    return await signed.submit();
}

// Update multisig config (requires current threshold)

export async function updateMultisigConfig(
 lucid: Awaited<ReturnType<typeof Lucid>>,
  params: {
    nftPolicyId: string;
    stateUtxo: UTxO;
    currentDatum: MultisigDatum;
    newSignerAddresses: string[];
    newThreshold: number;
    network: "Mainnet" | "Preprod";
  }
) {
    const { nftPolicyId, stateUtxo, currentDatum, newSignerAddresses, newThreshold, network } =
    params;

  const stateValidator = getMultisigStateValidator(nftPolicyId,NFT_ASSET_NAME_STRING);
  const stateAddress = validatorToAddress(network, stateValidator);

  const newSignerPkhs = newSignerAddresses.map((addr) => {
    const d = getAddressDetails(addr);
    return d.paymentCredential!.hash;
  });
  const { encodeMultisigDatum, encodeUpdateConfig} =await import("./datum");
  const newDatum = encodeMultisigDatum({ signers: newSignerPkhs, threshold: newThreshold});
  const redeemer = encodeUpdateConfig(newSignerPkhs,newThreshold);

  const tx = await lucid.newTx().collectFrom([stateUtxo],redeemer)
  .pay.ToContract(
    stateAddress,
    {kind: "inline" ,value: newDatum},
    stateUtxo.assets
  )
  .attach.SpendingValidator(stateValidator)
  .complete();
  return tx.toCBOR();
}