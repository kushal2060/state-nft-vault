import type {Lucid} from "@lucid-evolution/lucid"
import {
    Data,
    validatorToAddress,
    toUnit,
    fromText,
    toHex,
} from "@lucid-evolution/lucid"
import {
  getMultisigStateValidator,
  getVaultValidator,
  NFT_ASSET_NAME,
} from "./contract";
import { decodeMultisigDatum, encodeVaultRedeemer } from "./datum";
import { MultisigDatum, VaultState } from "./types";

//fetch current on-chain state
export async function fetchVaultState(
    lucid: Awaited<ReturnType<typeof Lucid>>,
    params: {nftPolicyId: string; network: "Preprod"}
): Promise<VaultState> {
    const {nftPolicyId, network} =params;
    const nftUnit = toUnit(nftPolicyId, fromText(NFT_ASSET_NAME));

    const stateValidator =getMultisigStateValidator(nftPolicyId);
    const VaultValidator = getVaultValidator(nftPolicyId);
    const stateAddress= validatorToAddress(network,stateValidator);
    const vaultAddress = validatorToAddress(network,VaultValidator);

    const [stateUtxos, vaultUtxos] = await Promise.all([
        lucid.utxosAt(stateAddress),
        lucid.utxosAt(vaultAddress),
    ]);

    const stateUtxo = stateUtxos.find((u)=> u.assets[nftUnit]) ?? null;
    const datum = stateUtxo?.datum? decodeMultisigDatum(stateUtxo.datum): null;

    const vaultBalance = vaultUtxos.reduce(
        (sum,u)=> sum + (u.assets.lovelace??0),
        BigInt(0)
    );
    return {stateUtxo,vaultUtxos,vaultBalance,datum}
}