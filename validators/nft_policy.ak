use aiken/collection/dict
use aiken/collection/list
use cardano/assets.{PolicyId}
use cardano/transaction.{OutputReference, Transaction}

// One-shot NFT: can only mint when a specific UTxO is consumed
// This guarantees uniqueness of the state NFT forever
validator nft_policy(utxo_ref: OutputReference) {
  mint(_redeemer: Data, policy_id: PolicyId, tx: Transaction) {
    let must_consume_utxo =
      list.any(tx.inputs, fn(i) { i.output_reference == utxo_ref })
    // Must mint exactly 1 token under this policy (NFT semantics)
    let minted_tokens = assets.tokens(tx.mint, policy_id)
    let valid_quantity =
      dict.size(minted_tokens) == 1 && list.all(
        dict.values(minted_tokens),
        fn(qty) { qty == 1 },
      )
    must_consume_utxo && valid_quantity
  }

  //no  burning aile

  else(_) {
    fail
  }
}
