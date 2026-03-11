"use client";
import { useState, useEffect, useCallback } from "react";
import { useLucid } from "@/hooks/useLucid";
import {
  fetchVaultState,
  depositToVault,
  buildSpendTx,
  signTxCbor,
  submitSignedTx,
} from "@/lib/vaultActions";
import { VaultState } from "@/lib/types";
import SignerStatus from "./SignerStatus";
import SpendPanel from "./SpendPanel";
import DepositForm from "./DepositForm";

const NETWORK = "Preprod" as const;

export default function VaultDashboard({ nftPolicyId }: { nftPolicyId: string }) {
  const { lucid, walletAddress, walletPkh } = useLucid();
  const [state, setState] = useState<VaultState | null>(null);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!lucid) return;
    try {
      const fresh = await fetchVaultState(lucid, { nftPolicyId, network: NETWORK });
      setState(fresh);
    } catch (e: any) {
      setError(e.message);
    }
  }, [lucid, nftPolicyId]);

  useEffect(() => { refresh(); }, [refresh]);

  const isAuthorizedSigner =
    walletPkh ? (state?.datum?.signers.includes(walletPkh) ?? false) : false;

  const handleDeposit = async (amount: bigint) => {
    if (!lucid) return;
    setLoading(true);
    setError(null);
    try {
      const hash = await depositToVault(lucid, { nftPolicyId, amount, network: NETWORK });
      setTxHash(hash);
      await lucid.awaitTx(hash);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildSpend = async (recipient: string, amount: bigint) => {
    if (!lucid || !state?.stateUtxo || !state.datum) return null;
    setLoading(true);
    setError(null);
    try {
      const cbor = await buildSpendTx(lucid, {
        nftPolicyId,
        stateUtxo: state.stateUtxo,
        vaultUtxos: state.vaultUtxos,
        datum: state.datum,
        recipient,
        amount,
        network: NETWORK,
      });
      return cbor;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (txCbor: string) => {
    if (!lucid) return null;
    setLoading(true);
    setError(null);
    try {
      return await signTxCbor(lucid, txCbor);
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (txCbor: string) => {
    if (!lucid) return;
    setLoading(true);
    setError(null);
    try {
      const hash = await submitSignedTx(lucid, txCbor);
      setTxHash(hash);
      await lucid.awaitTx(hash);
      await refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── Header ───────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Multisig Vault</h1>
            <p className="text-sm text-gray-500 font-mono mt-1">
              NFT Policy: {nftPolicyId.slice(0, 20)}…
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 
                       border border-gray-700 transition-all disabled:opacity-50"
          >
            ↻ Refresh
          </button>
        </div>

        {/* ── State NFT indicator ───────────────────────── */}
        <div className="flex items-center gap-2 text-sm px-4 py-2 bg-gray-900 rounded-lg 
                        border border-gray-800 w-fit">
          <span className={`w-2 h-2 rounded-full ${
            state?.stateUtxo ? "bg-green-400 shadow-[0_0_6px_#4ade80]" : "bg-red-500"
          }`} />
          <span className="text-gray-400">
            State NFT: {state?.stateUtxo ? "Active" : "Not Initialized"}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ──────────────────────────────── */}
          <div className="space-y-6">

            {/* Vault Balance */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <p className="text-sm text-gray-500 mb-1">Vault Balance</p>
              <p className="text-4xl font-mono font-bold text-white">
                ₳ {state ? (Number(state.vaultBalance) / 1_000_000).toFixed(2) : "—"}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {state?.vaultUtxos.length ?? 0} UTxO(s) at vault address
              </p>
            </div>

            {/* Deposit */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Deposit to Vault
              </h3>
              <DepositForm onDeposit={handleDeposit} loading={loading} />
            </div>
          </div>

          {/* ── RIGHT COLUMN ─────────────────────────────── */}
          <div className="space-y-6">

            {/* Signers & Threshold */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Governance
              </h3>
              {state?.datum ? (
                <SignerStatus
                  datum={state.datum}
                  currentWalletPkh={walletPkh}
                />
              ) : (
                <p className="text-gray-600 text-sm">No state loaded</p>
              )}
            </div>

            {/* Spend Panel */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Spend Funds
              </h3>
              {state?.datum ? (
                <SpendPanel
                  datum={state.datum}
                  vaultBalance={state.vaultBalance}
                  isAuthorizedSigner={isAuthorizedSigner}
                  onBuild={handleBuildSpend}
                  onSign={handleSign}
                  onSubmit={handleSubmit}
                  loading={loading}
                />
              ) : (
                <p className="text-gray-600 text-sm">Vault not initialized</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Error ────────────────────────────────────── */}
        {error && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-red-400 text-sm">
            ⚠ {error}
          </div>
        )}

        {/* ── Tx Hash ──────────────────────────────────── */}
        {txHash && (
          <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-4">
            <p className="text-green-400 text-sm mb-1">✓ Transaction Submitted</p>
            
              href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-green-500 hover:text-green-300 underline break-all"
            >
              {txHash}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}