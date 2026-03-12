import { UTxO } from "@lucid-evolution/lucid";

export interface MultisigDatum {
  signers: string[];   // pub key hashes (hex)
  threshold: number;
}

export interface VaultState {
  stateUtxo: UTxO | null;
  vaultUtxos: UTxO[];
  datum: MultisigDatum | null;
  vaultBalance: bigint;
}

export interface ContractAddresses {
  stateAddress: string;
  vaultAddress: string;
  nftPolicyId: string;
}


export interface PartialTx {
  txCbor: string;
  recipient: string;
  amount: bigint;
  signedBy: string[];  // PKHs who have signed so far
}