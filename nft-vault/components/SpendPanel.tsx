"use client";
import { useState } from "react";
import { MultisigDatum } from "@/lib/types";

type Step = "form" | "signing" | "submit";

const WALLET_LABELS: Record<string, string> = {
  eternl: "Eternl", nami: "Nami", lace: "Lace", typhon: "Typhon",
  vespr: "Vespr", flint: "Flint", yoroi: "Yoroi", nufi: "NuFi", gerowallet: "GeroWallet",
};

interface Props {
  datum: MultisigDatum;
  vaultBalance: bigint;
  isAuthorizedSigner: boolean;
  availableWallets: string[];
  onBuild: (recipient: string, amount: bigint) => Promise<string | null>;
  onSign: (txCbor: string) => Promise<string | null>;
  onSwitchWallet: (walletName: string) => Promise<void>;
  onSubmit: (txCbor: string) => Promise<void>;
  loading: boolean;
}

export default function SpendPanel({
  datum, vaultBalance, isAuthorizedSigner,
  availableWallets, onBuild, onSign, onSwitchWallet, onSubmit, loading,
}: Props) {
  const [step, setStep] = useState<Step>("form");
  const [recipient, setRecipient] = useState("");
  const [adaAmount, setAdaAmount] = useState("");
  const [txCbor, setTxCbor] = useState("");
  const [signaturesCollected, setSignaturesCollected] = useState(0);
  const [waitingForSwitch, setWaitingForSwitch] = useState(false);
  const [switchingWallet, setSwitchingWallet] = useState(false);

  const amountLovelace = BigInt(Math.floor(parseFloat(adaAmount || "0") * 1_000_000));
  const amountValid = amountLovelace > 0 && amountLovelace <= vaultBalance;

  const reset = () => {
    setStep("form"); setTxCbor(""); setSignaturesCollected(0); setWaitingForSwitch(false);
  };

  const handleBuild = async () => {
    const cbor = await onBuild(recipient, amountLovelace);
    if (cbor) {
      setTxCbor(cbor);
      setSignaturesCollected(0);
      setWaitingForSwitch(false);
      setStep("signing");
    }
  };

  const handleSign = async () => {
    const signed = await onSign(txCbor);
    if (signed) {
      setTxCbor(signed);
      const newCount = signaturesCollected + 1;
      setSignaturesCollected(newCount);
      if (newCount >= datum.threshold) {
        setStep("submit");
      } else {
        setWaitingForSwitch(true);
      }
    }
  };

  const handleSwitchWallet = async (walletName: string) => {
    setSwitchingWallet(true);
    try {
      await onSwitchWallet(walletName);
      setWaitingForSwitch(false);
    } finally {
      setSwitchingWallet(false);
    }
  };

  const handleSubmit = async () => {
    await onSubmit(txCbor);
    reset();
    setRecipient("");
    setAdaAmount("");
  };

  if (!isAuthorizedSigner && step === "form") {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600 text-sm">Your wallet is not an authorized signer.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Progress indicator */}
      <div className="flex gap-2">
        {(["form", "signing", "submit"] as Step[]).map((s, i) => (
          <div key={s} className={`flex items-center gap-1.5 text-xs ${step === s ? "text-white" : "text-gray-600"}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
              ${step === s ? "bg-blue-600" : "bg-gray-700"}`}>
              {i + 1}
            </span>
            <span className="capitalize hidden sm:inline">
              {s === "form" ? "Build" : s === "signing" ? "Sign" : "Submit"}
            </span>
            {i < 2 && <span className="text-gray-700 ml-1">›</span>}
          </div>
        ))}
      </div>

      {/* ── Step 1: Build ── */}
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
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ADA</span>
          </div>
          {adaAmount && !amountValid && (
            <p className="text-red-400 text-xs">
              Amount exceeds vault balance ({(Number(vaultBalance) / 1_000_000).toFixed(2)} ADA)
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

      {/* ── Step 2: Sign (sequential) ── */}
      {step === "signing" && (
        <div className="space-y-4">

          {/* Signatures progress dots */}
          <div className="bg-gray-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">Signatures collected</span>
            <div className="flex gap-1.5">
              {Array.from({ length: datum.threshold }).map((_, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                    ${i < signaturesCollected ? "bg-green-600 text-white" : "bg-gray-700 text-gray-500"}`}
                >
                  {i < signaturesCollected ? "✓" : i + 1}
                </span>
              ))}
            </div>
          </div>

          {!waitingForSwitch ? (
            /* Sign with currently connected wallet */
            <div className="space-y-3">
              <p className="text-gray-400 text-xs">
                Sign as <strong className="text-white">Signer {signaturesCollected + 1}</strong> of{" "}
                {datum.threshold} using your currently connected wallet.
              </p>
              <button
                onClick={handleSign}
                disabled={loading}
                className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold 
                           rounded-xl transition-all disabled:opacity-40"
              >
                {loading ? "Signing…" : `✍ Sign (${signaturesCollected + 1} of ${datum.threshold})`}
              </button>
            </div>
          ) : (
            /* Wallet picker for next signer */
            <div className="space-y-3">
              <p className="text-gray-400 text-xs">
                <span className="text-green-400 font-semibold">✓ Signature {signaturesCollected} collected.</span>{" "}
                Now connect the next signer's wallet to continue.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {availableWallets.map((w) => (
                  <button
                    key={w}
                    onClick={() => handleSwitchWallet(w)}
                    disabled={switchingWallet}
                    className="py-2 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 
                               hover:border-blue-500 rounded-xl text-sm text-white transition-all 
                               disabled:opacity-40"
                  >
                    {switchingWallet ? "Connecting…" : (WALLET_LABELS[w] ?? w)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={reset} className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Start over
          </button>
        </div>
      )}

      {/* ── Step 3: Submit ── */}
      {step === "submit" && (
        <div className="space-y-3">
          <div className="bg-green-900/20 border border-green-700/40 rounded-xl p-3 flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <p className="text-green-400 text-xs">
              All {datum.threshold} signatures collected. Ready to submit.
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold 
                       rounded-xl transition-all disabled:opacity-40"
          >
            {loading ? "Submitting…" : "⚡ Submit Transaction"}
          </button>
          <button onClick={() => setStep("signing")} className="w-full text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Back to signing
          </button>
        </div>
      )}
    </div>
  );
}