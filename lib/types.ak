use aiken/crypto.{VerificationKeyHash}

pub type MultiSignDatum {
  signers: List<VerificationKeyHash>,
  threshold: Int,
}

//this reedemer will check the who is spending
pub type VaultRedeemer {
  signatures: List<VerificationKeyHash>,
}

//update governance params or reset
pub type MultiRedeemer {
  UpdateConfig { new_signers: List<VerificationKeyHash>, new_threshold: Int }
  Reset
}
