"use client";
import { useState } from "react";
import type { Lucid } from "@lucid-evolution/lucid";
import { setupVaultSystem } from "@/lib/setupAction";

interface Props {
  lucid: Awaited<ReturnType<typeof Lucid>>;
  currentWalletAddress: string;
  onComplete: (nftPolicyId: string) => void;
}

export default function SetupPanel({ lucid, currentWalletAddress, onComplete }: Props) {
  const [signerInputs, setSignerInputs] = useState<string[]>([currentWalletAddress, "", ""]);
  const [threshold, setThreshold] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const validSigners = signerInputs.filter((s) => s.trim().startsWith("addr"));
  const thresholdValid = threshold >= 1 && threshold <= validSigners.length;

  const updateSigner = (i: number, val: string) => {
    setSignerInputs((prev) => prev.map((s, idx) => (idx === i ? val : s)));
  };

  const addSigner = () => setSignerInputs((prev) => [...prev, ""]);
  const removeSigner = (i: number) =>
    setSignerInputs((prev) => prev.filter((_, idx) => idx !== i));

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const { txHash: hash, nftPolicyId } = await setupVaultSystem(lucid, {
        signerAddresses: validSigners,
        threshold,
        network: "Preprod",
      });
      setTxHash(hash);
      await lucid.awaitTx(hash);
      onComplete(nftPolicyId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Initialize Vault</h2>
        <p className="text-sm text-gray-500 mt-1">
          Mints the state NFT and sets authorized signers on-chain. This is a one-time setup.
        </p>
      </div>

      {/* Signers */}
      <div className="space-y-3">
        <label className="text-sm text-gray-400 font-medium">Authorized Signers</label>
        {signerInputs.map((val, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={val}
              onChange={(e) => updateSigner(i, e.target.value)}
              placeholder={`Signer ${i + 1} address (addr_test1…)`}
              className="flex-1 px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl 
                         text-white text-sm font-mono placeholder-gray-600 
                         focus:border-blue-500 focus:outline-none transition-colors"
            />
            {i === 0 ? (
              <span className="px-3 py-2.5 text-xs text-yellow-500 bg-yellow-900/20 
                               border border-yellow-700/30 rounded-xl whitespace-nowrap">
                you
              </span>
            ) : (
              <button
                onClick={() => removeSigner(i)}
                className="px-3 py-2.5 text-gray-500 hover:text-red-400 bg-gray-800 
                           border border-gray-700 rounded-xl transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={addSigner}
          className="text-sm text-blue-500 hover:text-blue-400 transition-colors"
        >
          + Add signer
        </button>
      </div>

      {/* Threshold */}
      <div className="space-y-2">
        <label className="text-sm text-gray-400 font-medium">
          Threshold —{" "}
          <span className="text-white font-bold">{threshold}</span> of{" "}
          <span className="text-white font-bold">{validSigners.length}</span> required
        </label>
        <input
          type="range"
          min={1}
          max={Math.max(validSigners.length, 1)}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>1 (any signer)</span>
          <span>{validSigners.length} (all signers)</span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-1 text-sm">
        <p className="text-gray-400">
          Valid signers: <span className="text-white">{validSigners.length}</span>
        </p>
        <p className="text-gray-400">
          Signatures required to spend:{" "}
          <span className="text-white font-bold">{threshold}</span>
        </p>
        <p className="text-gray-400">
          Network: <span className="text-white">Preprod</span>
        </p>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-3 
                        text-red-400 text-sm">
          ⚠ {error}
        </div>
      )}

      {txHash && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-3 text-sm">
          <p className="text-green-400 mb-1">✓ Setup tx submitted — awaiting confirmation…</p>
          
            href={`https://preprod.cardanoscan.io/transaction/${txHash}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-green-500 underline break-all"
          
            {txHash}
     
        </div>
      )}

      <button
        onClick={handleSetup}
        disabled={loading || validSigners.length < 1 || !thresholdValid}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold 
                   rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "Initializing…" : "Initialize Vault"}
      </button>
    </div>
  );
}