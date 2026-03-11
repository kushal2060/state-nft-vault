import {
  applyParamsToScript,
  MintingPolicy,
  SpendingValidator,
  fromText,
  fromHex,
} from "@lucid-evolution/lucid";
import { Constr } from "@lucid-evolution/lucid";
import blueprint from "../../plutus.json";

export const NFT_ASSET_NAME = "VaultStateNFT";

function findValidator(title: string) {
  const v = blueprint.validators.find((v: any) => v.title === title);
  if (!v) throw new Error(`Validator ${title} not found in plutus.json`);
  return v.compiledCode;
}

// One-shot NFT minting policy — parameterized by seed UTxO reference
export function getNftPolicy(utxoRef: {
  txHash: string;
  outputIndex: number;
}): MintingPolicy {
  const script = applyParamsToScript(findValidator("nft_policy.nft_policy"), [
    new Constr(0, [fromHex(utxoRef.txHash) as any, BigInt(utxoRef.outputIndex)]),
  ]);
  return { type: "PlutusV3", script };
}

// Multisig state validator — parameterized by NFT policy + asset name
export function getMultisigStateValidator(
  nftPolicyId: string
): SpendingValidator {
  const script = applyParamsToScript(
    findValidator("multisig_state.multisig_state"),
    [fromHex(nftPolicyId) as any, fromText(NFT_ASSET_NAME)]
  );
  return { type: "PlutusV3", script };
}

// Vault validator — parameterized by NFT policy + asset name
export function getVaultValidator(nftPolicyId: string): SpendingValidator {
  const script = applyParamsToScript(findValidator("vault.vault"), [
    fromHex(nftPolicyId) as any,
    fromText(NFT_ASSET_NAME),
  ]);
  return { type: "PlutusV3", script };
}