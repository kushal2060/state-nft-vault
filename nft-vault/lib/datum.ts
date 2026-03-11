import { Data, Constr, fromHex, toHex } from "@lucid-evolution/lucid";
import { MultisigDatum } from "./types";

// Encode MultisigDatum → on-chain Plutus data
export function encodeMultisigDatum(datum: MultisigDatum): string {
  return Data.to(
    new Constr(0, [
      datum.signers.map((s) => fromHex(s) as any),
      BigInt(datum.threshold),
    ])
  );
}

// Decode on-chain Plutus data → MultisigDatum
export function decodeMultisigDatum(raw: string): MultisigDatum {
  const data = Data.from(raw) as Constr<Data>;
  const [signers, threshold] = data.fields;
  return {
    signers: (signers as any).map(toHex),
    threshold: Number(threshold),
  };
}

// VaultRedeemer: list of signing PKHs
export function encodeVaultRedeemer(signatures: string[]): string {
  return Data.to(
    new Constr(0, [signatures.map((s) => fromHex(s) as any)])
  );
}

// MultisigState redeemer: UpdateConfig
export function encodeUpdateConfig(
  newSigners: string[],
  newThreshold: number
): string {
  return Data.to(
    new Constr(0, [
      newSigners.map((s) => fromHex(s) as any),
      BigInt(newThreshold),
    ])
  );
}

// MultisigState redeemer: Reset
export const REDEEMER_RESET = Data.to(new Constr(1, []));