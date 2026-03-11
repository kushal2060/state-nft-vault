"use client";
import { useState } from "react";
import { MultisigDatum } from "@/lib/types";

type Step = "form" | "sign" | "submit";

interface Props {
  datum: MultisigDatum;
  vaultBalance: bigint;
  isAuthorizedSigner: boolean;
  onBuild: (recipient: string, amount: bigint) => Promise<string | null>;
  onSign: (txCbor: string) => Promise<string | null>;
  onSubmit: (txCbor: string) => Promise<void>;
  loading: boolean;
}

export default function SpendPanel({
  datum, vaultBalance, isAuthorizedSigner,
  onBuild, onSign, onSubmit, loading,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [recipient, setRecipient] = useState("");
  const [adaAmount, setAdaAmount] = useState("");
  const [txCbor, setTxCbor] = useState("");
  const [pastedCbor, setPastedCbor] = useState("");

  const amountLovelace = BigInt(Math.floor(parseFloat(adaAmount || "0") * 1_000_000));
  const amountValid = amountLovelace > 0n && amountLovelace <= vaultBalance;

  // Step 1: Build the tx (first signer)
  const handleBuild = async () => {
    const cbor = await onBuild(recipient, amountLovelace);
    if (cbor) {
      setTxCbor(cbor);
      setStep("sign");
    }
  };

  // Step 2: Sign (current wallet signs the tx CBOR)
  const handleSign = async () => {
    const source = pastedCbor || txCbor;
    const signed = await onSign(source);
    if (signed) {
      setTxCbor(signed);
      setPastedCbor("");
    }
  };

  // Step 3: Submit the fully signed tx
  const handleSubmit = async () => {
    const source = pastedCbor || txCbor;
    await onSubmit(source);
    // Reset
    setStep("form");
    setTxCbor("");
    setPastedCbor("");
    setRecipient("");
    setAdaAmount("");
  };

  const copyToClipboard = () => navigator.clipboard.writeText(txCbor);

  // ── Not a signer ──────────────────────────────────────────────────────
  if (!isAuthorizedSigner && step === "form") {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600 text-sm">Your wallet is not an authorized signer.</p>
        {/* Allow pasting a tx to sign / submit as coordinator */}
        <button
          onClick={() => setStep("sign")}
          className="mt-3 text-xs text-blue-500 underline hover:text-blue-400"
        >
          Paste a tx to co-sign or submit
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Step Indicator ──────────────────────────────── */}
      <div className="flex gap-2">
        {(["form", "sign", "submit"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-1.5 text-xs ${
              step === s ? "text-white" : "text-gray-600"
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s ? "bg-blue-600" : "bg-gray-700"}`}>
              {i + 1}
            </span>
            <span className="capitalize hidden sm:inline">{s === "form" ? "Build" : s}</span>
            {i < 2 && <span className="text-gray-700 ml-1">›</span>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Build ───────────────────────────────── */}
      {step === "form" && (
        <div className="space-y-3">
          <input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient address (addr_test1...)"
            className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl 
                       text-white text-sm placeholder-gray-600 focus:border-blue-500 
                       focus:outline-none transition-colors"
          />
          <div className="relative">
            <input
              value={adaAmount}
              onChange={(e) => setAdaAmount(e.target.value)}
              placeholder="Amount"
              type="number"
              min="0"
              className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl 
                         text-white text-sm placeholder-gray-600 focus:border-blue-500 
                         focus:outline-none transition-colors pr-14"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              ADA
            </span>
          </div>
          {adaAmount && !amountValid && (
            <p className="text-red-400 text-xs">
              Amount exceeds vault balance (
              {(Number(vaultBalance) / 1_000_000).toFixed(2)} ADA)
            </p>
          )}
          <button
            onClick={handleBuild}
            disabled={loading || !recipient || !amountValid}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold 
                       rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Building…" : "Build Transaction"}
          </button>
        </div>
      )}

      {/* ── Step 2: Sign & Share ─────────────────────────── */}
      {step === "sign" && (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs">
            This transaction requires <strong className="text-white">{datum.threshold}</strong> of{" "}
            <strong className="text-white">{datum.signers.length}</strong> signers.
            Sign with your wallet, then share the CBOR with co-signers.
          </p>

          {/* Current CBOR output */}
          {txCbor && (
            <div className="bg-gray-800 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Transaction CBOR</span>
                <button
                  onClick={copyToClipboard}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="font-mono text-xs text-green-400 break-all line-clamp-3">
                {txCbor}
              </p>
            </div>
          )}

          {/* Paste field for co-signers */}
          <textarea
            value={pastedCbor}
            onChange={(e) => setPastedCbor(e.target.value)}
            placeholder="Paste CBOR from another signer here (optional)…"
            rows={3}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl 
                       text-white text-xs font-mono placeholder-gray-600 focus:border-blue-500 
                       focus:outline-none transition-colors resize-none"
          />

          <div className="flex gap-2">
            {/* Sign button */}
            <button
              onClick={handleSign}
              disabled={loading || (!txCbor && !pastedCbor)}
              className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold 
                         rounded-xl transition-all disabled:opacity-40"
            >
              {loading ? "Signing…" : "✍ Sign"}
            </button>
            {/* Proceed to submit */}
            <button
              onClick={() => setStep("submit")}
              disabled={!txCbor && !pastedCbor}
              className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-semibold 
                         rounded-xl transition-all disabled:opacity-40"
            >
              Ready to Submit →
            </button>
          </div>

          <button
            onClick={() => { setStep("form"); setTxCbor(""); }}
            className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            ← Start over
          </button>
        </div>
      )}

      {/* ── Step 3: Submit ───────────────────────────────── */}
      {step === "submit" && (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs">
            Paste the final CBOR (with all {datum.threshold} signatures) and submit to the chain.
          </p>

          <textarea
            value={pastedCbor || txCbor}
            onChange={(e) => setPastedCbor(e.target.value)}
            placeholder="Final signed tx CBOR…"
            rows={4}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-xl 
                       text-white text-xs font-mono placeholder-gray-600 focus:border-blue-500 
                       focus:outline-none transition-colors resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={loading || (!txCbor && !pastedCbor)}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold 
                       rounded-xl transition-all disabled:opacity-40"
          >
            {loading ? "Submitting…" : "⚡ Submit Transaction"}
          </button>

          <button
            onClick={() => setStep("sign")}
            className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            ← Back to signing
          </button>
        </div>
      )}
    </div>
  );
}