# Multisig Vault — Cardano

A two-contract multisignature vault system on Cardano where funds can only be spent when the required number of authorized signers approve the transaction. Built with Aiken (smart contracts) and Next.js (frontend).

---

## How It Works

The system uses two on-chain contracts secured by a one-shot NFT:

**Multisig State Contract** — Holds a UTxO containing the NFT + a datum with the list of authorized signer public key hashes and the spending threshold. This UTxO is never consumed during spends — it acts as a read-only reference.

**Vault Contract** — Holds the actual ADA. To spend from it, a transaction must reference the state UTxO (proving it holds the NFT) and carry signatures from enough authorized signers to meet the threshold.

**The NFT** — Minted once using a seed UTxO, making it a one-shot policy. Its policy ID is baked into both contract scripts as a parameter, so each vault initialization produces a completely unique and isolated pair of contract addresses.

---
## Usage

**1. Initialize Vault**
Connect your wallet, click "Initialize New Vault", add signer addresses and set the threshold, then confirm the setup transaction. Save the NFT Policy ID that is generated — this is your vault's unique identifier.

**2. Share the Policy ID**
Send the NFT Policy ID to all co-signers. They paste it into the "Load existing vault" field to connect to the same vault.

**3. Deposit**
Anyone can send ADA to the vault from the Deposit panel.

**4. Spend**
An authorized signer fills in the recipient and amount, builds the transaction, and copies the CBOR. Co-signers paste the CBOR, sign it, and pass it along. Once enough signatures are collected the final CBOR is submitted.

**5. Update Config**
To change signers or threshold, use UpdateConfig — requires the current threshold of signatures from existing signers.

---
---
## Contracts

| Validator | File | Parameters |
|---|---|---|
| NFT Minting Policy | `validators/nft_policy.ak` | `utxo_ref` (seed UTxO) |
| Multisig State | `validators/multi_sign.ak` | `nft_policy_id`, `nft_asset_name` |
| Vault | `validators/vault.ak` | `nft_policy_id`, `nft_asset_name` |

### Multisig State Datum
```
{ signers: [PKH, PKH, ...], threshold: Int }
```

### Vault Redeemer
```
{ signatures: [PKH, PKH, ...] }
```

---

## Tech Stack

- **Smart Contracts** — [Aiken](https://aiken-lang.org) (Plutus V3)
- **Frontend** — [Next.js](https://nextjs.org) + Tailwind CSS
- **Cardano SDK** — [@lucid-evolution/lucid](https://github.com/Anastasia-Labs/lucid-evolution)
- **Chain Provider** — [Blockfrost](https://blockfrost.io)
- **Network** — Cardano Preprod Testnet

---

## Getting Started

### Prerequisites
- Node.js 18+
- Aiken CLI
- Blockfrost API key (Preprod)

### Install

```bash
git clone <repo-url>
cd <project>
npm install
```

### Environment

Create `.env.local`:
```
NEXT_PUBLIC_BLOCKFROST_API_KEY=preprodXXXXXXXXXXXXXXXX
```

### Build Contracts

```bash
aiken build
```

This generates `plutus.json` — copy it into your Next.js project root.

### Run

```bash
npm run dev
```

---
## Security Model

- The NFT policy is one-shot — it can only ever mint one token, tied to a specific seed UTxO that is consumed at setup
- The NFT policy ID is baked into the vault and state script parameters — every vault is cryptographically isolated
- The vault contract only trusts the state UTxO that holds the specific NFT from setup — fake state UTxOs at the same address are ignored
- Signer PKHs are verified against `tx.extra_signatories` on-chain — you cannot claim a signature without actually providing it
- The state UTxO is a reference input during spends — it cannot be modified or consumed as part of a vault spend transaction

---

## Supported Wallets

 Eternl · Lace

---

