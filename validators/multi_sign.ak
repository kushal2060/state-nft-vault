use aiken/collection/list
use cardano/assets.{AssetName, PolicyId, quantity_of}
use cardano/transaction.{InlineDatum, Input, Transaction}
use types.{MultiRedeemer, MultiSignDatum, Reset, UpdateConfig}

// Holds the governance config (signers + threshold) secured by the NFT.
// The vault REFERENCES this UTxO — it is NOT consumed during vault spends.
//  It can only be updated when the current threshold of signers approves. 

validator multisig_state(nft_policy: PolicyId, nft_name: AssetName) {
  spend(
    datum_opt: Option<MultiSignDatum>,
    reedemer: MultiRedeemer,
    own_input: Input,
    tx: Transaction,
  ) {
    // Find the single continuing output back to this script address
    expect Some(datum) = datum_opt
    let owner_address = own_input.output.address
    let continuing_outputs =
      list.filter(tx.outputs, fn(o) { o.address == owner_address })
    expect [cont_output] = continuing_outputs
    // NFT must stay in the continuing output (permanent state anchor)
    let nft_preserved =
      quantity_of(cont_output.value, nft_policy, nft_name) == 1

    //decode the new datum form continuing datum
    expect InlineDatum(raw_datum) = cont_output.datum
    expect new_datum: MultiSignDatum = raw_datum

    //how many signed
    let valid_signer_count =
      list.length(
        list.filter(
          datum.signers,
          fn(pkh) { list.has(tx.extra_signatories, pkh) },
        ),
      )
    let threshold_met = valid_signer_count >= datum.threshold
    when reedemer is {
      UpdateConfig { new_signers, new_threshold } -> {
        let valid_threshold =
          // New threshold must be valid (> 0 and <= number of new signers)
          new_threshold > 0 && new_threshold <= list.length(new_signers)
        // New datum must match what was declared in the redeemer
        let datum_matches =
          new_datum.signers == new_signers && new_datum.threshold == new_threshold
        nft_preserved && datum_matches && valid_threshold && threshold_met
      }
      Reset -> {
        // Diagram shows: Pay minAda, Datum: [], threshold
        // Empty signers list, threshold value preserved
        let valid_reset =
          new_datum.signers == [] && new_datum.threshold == datum.threshold

        nft_preserved && threshold_met && valid_reset
      }
    }
  }

  else(_) {
    fail
  }
}
