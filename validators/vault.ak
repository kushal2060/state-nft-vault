use aiken/collection/list
use cardano/assets.{AssetName, PolicyId, quantity_of}
use cardano/transaction.{InlineDatum, Input, Transaction}
use types.{MultiSignDatum, VaultRedeemer}

// Vault holds funds. Spending requires:
//  The multisig state UTxO (with NFT) is present as a REFERENCE INPUT
// The redeemer lists the signing PKHs
//  Those PKHs are all in the signers list
//  The count meets the threshold
// Each listed PKH actually signed the tx (in extra_signatories)

validator vault(state_nft_policy: PolicyId, state_nft_name: AssetName) {
  spend(
    _datum: Option<Data>,
    redeemer: VaultRedeemer,
    _own_input: Input,
    tx: Transaction,
  ) {
    // Find the multisig state UTxO in REFERENCE inputs (not regular inputs)
    // The NFT proves this is the authentic state UTxO — no forgery possible
    let state_ref_opt =
      list.find(
        tx.reference_inputs,
        fn(i) {
          quantity_of(i.output.value, state_nft_policy, state_nft_name) == 1
        },
      )
    expect Some(state_ref) = state_ref_opt

    expect InlineDatum(raw) = state_ref.output.datum
    expect state_datum: MultiSignDatum = raw

    let VaultRedeemer { signatures } = redeemer

    let all_are_signers =
      list.all(signatures, fn(pkh) { list.has(state_datum.signers, pkh) })

    let all_have_signed =
      list.all(signatures, fn(pkh) { list.has(tx.extra_signatories, pkh) })

    let no_duplicates =
      list.length(signatures) == list.length(list.unique(signatures))

    let threshold_met = list.length(signatures) >= state_datum.threshold

    all_are_signers && all_have_signed && threshold_met && no_duplicates
  }

  else(_) {
    fail
  }
}
