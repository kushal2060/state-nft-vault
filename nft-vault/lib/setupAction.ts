import type { Lucid } from "@lucid-evolution/lucid";
import {UTxO, Data, mintingPolicyToId, validatorToAddress, toUnit, fromText,getAddressDetails} from "@lucid-evolution/lucid";
import { getNftPolicy, getMultisigStateValidator, NFT_ASSET_NAME, getVaultValidator } from "./contract";
import { encodeMultisigDatum, encodeVaultRedeemer } from "./datum";
import { MultisigDatum, VaultState } from "./types";
export async function setupVaultSystem(
    lucid:Awaited<ReturnType<typeof Lucid>>,
    params: {
        signerAddresses: string[];
        threshold: number;
        network: "Preprod";
    }
) {
    const {signerAddresses, threshold, network} =params;
    //seed utxo to use as one shot nft parameter
    const [seedUtxo] =await lucid.wallet().getUtxos();
    if(!seedUtxo) throw new Error("No Utxos found in wallet");

    const nftPolicy =getNftPolicy({
        txHash: seedUtxo.txHash,
        outputIndex:seedUtxo.outputIndex,
    });
    const nftPolicyId = mintingPolicyToId(nftPolicy);
    const nftUnit = toUnit(nftPolicyId, fromText(NFT_ASSET_NAME));

    const signerPKHs= signerAddresses.map((addr)=> {
        const details = getAddressDetails(addr);
        if(!details.paymentCredential)
            throw new Error(`Cant extract pkh from address: ${addr}`);
        return details.paymentCredential.hash;
    })
    const stateValidator = getMultisigStateValidator(nftPolicyId);
    const stateAddress = validatorToAddress(network, stateValidator);

    const initialDatum = encodeMultisigDatum({
        signers: signerPKHs,
        threshold,
    });

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
    const signed = await tx.sign.withWallet().complete();
    const txHash = await signed.submit();

    return {txHash, nftPolicyId, stateAddress};
}

//put ada onto vault
export async function depositVault(
    lucid: Awaited<ReturnType<typeof Lucid>>,
    params: {nftPolicyId: string; amount: bigint; network: "Preprod"}
) {
    const {nftPolicyId,amount,network}=params;
    const vaultValidator = getVaultValidator(nftPolicyId);
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
  }
): Promise<string> {
    const {nftPolicyId,stateUtxo,vaultUtxos,datum,recipient,amount,network}=params;
    const stateValidator = getMultisigStateValidator(nftPolicyId);
    const vaultValidator = getVaultValidator(nftPolicyId);

    const redeemer = encodeVaultRedeemer(datum.signers);
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
    
    //add required sogners 
    const walletAddress = await lucid.wallet().address();
    // const {paymentCredential}=getAddressDetails(walletAddress);
    txBuilder = txBuilder.addSigner(walletAddress);

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
// export async function submitSignedTx(
//     lucid: Awaited<ReturnType<typeof Lucid>>,
//     txCbor: string
// ): Promise<string> {
//     const tx = lucid.fromTx(txCbor);
//     return await tx.submit();
// }

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

  const stateValidator = getMultisigStateValidator(nftPolicyId);
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