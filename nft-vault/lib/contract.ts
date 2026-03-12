import { applyParamsToScript, Constr, fromHex, MintingPolicy, SpendingValidator , OutRef, toHex } from "@lucid-evolution/lucid";
import { fromText } from "@lucid-evolution/lucid";

import blueprint from "../plutus.json"

export const NFT_ASSET_NAME_STRING = "VaultStateNFT";
export const NFT_ASSET_NAME = fromText(NFT_ASSET_NAME_STRING);


export function getNftPolicy(utxoRef: {txHash: string; outputIndex: number}):MintingPolicy{
    const {txHash, outputIndex} = utxoRef;
    
    const appliedScript = applyParamsToScript(
        blueprint.validators.find((v:any) => v.title === "nft_policy.nft_policy.mint")!.compiledCode,
        [
            new Constr(0, [txHash, BigInt(outputIndex)]),
        ]
    );
    return {type: "PlutusV3" ,script: appliedScript};
}

//Apply NFT policy + asset name 
export function getMultisigStateValidator(
    nftPolicyId: string,
    nftAssetName: string
): SpendingValidator {
    const appliedScript = applyParamsToScript(
        blueprint.validators.find((v:any) => v.title === "multi_sign.multisig_state.spend")!.compiledCode,
        // Pass policy as hex string, asset name as bytes
        [nftPolicyId, fromText(nftAssetName)]
    );
    return { type:"PlutusV3" , script: appliedScript};
}

// Apply NFT policy + asset name to the vault validator
export function getVaultValidator(
    nftPolicyId: string,
    nftAssetName: string
) : SpendingValidator {
    const appliedScript = applyParamsToScript(
        blueprint.validators.find((v: any) => v.title === "vault.vault.spend")!.compiledCode,
        // Pass policy as hex string, asset name as bytes
        [nftPolicyId, fromText(nftAssetName)]
    );
    return {type:"PlutusV3", script:appliedScript};
}