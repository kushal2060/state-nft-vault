"use client";
import { useState } from "react";
import { useLucid } from "@/hooks/useLucid";
import dynamic from "next/dynamic";

// Disable SSR for components that import Lucid utilities
const VaultDashboard = dynamic(() => import("@/components/VaultDashboar"), {
  ssr: false,
});
const SetupPanel = dynamic(() => import("@/components/SetupPanel"), {
  ssr: false,
});

export default function Home() {
  const { lucid, walletAddress, walletPkh, connected, connect, availableWallets } = useLucid();
  const [nftPolicyId, setNftPolicyId] = useState<string | null>(
    // Persist across reloads so you don't re-setup every time
    typeof window !== "undefined" ? localStorage.getItem("nftPolicyId") : null
  );
  const [showSetup, setShowSetup] = useState(false);

  const handleSetupComplete = (policyId: string) => {
    localStorage.setItem("nftPolicyId", policyId);
    setNftPolicyId(policyId);
    setShowSetup(false);
  };

  const handleReset = () => {
    localStorage.removeItem("nftPolicyId");
    setNftPolicyId(null);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white">

      {/* ── Top Nav ──────────────────────────────────────────── */}
      <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold">V</span>
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">MultisigVault</h1>
              <p className="text-xs text-gray-500">Cardano · Preprod</p>
            </div>
          </div>

          {/* Right side: wallet + setup */}
          <div className="flex items-center gap-3">

            {/* Setup / Reset button — only shown when connected */}
            {connected && (
              nftPolicyId ? (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 text-xs text-gray-500 hover:text-red-400 
                             border border-gray-700 hover:border-red-700/50 rounded-lg 
                             transition-all"
                >
                  Reset Vault
                </button>
              ) : (
                <button
                  onClick={() => setShowSetup(true)}
                  className="px-3 py-1.5 text-xs text-blue-400 hover:text-blue-300 
                             border border-blue-700/50 hover:border-blue-500 rounded-lg 
                             transition-all"
                >
                  + Initialize Vault
                </button>
              )
            )}

            {/* Wallet connect */}
            {!connected ? (
              <WalletConnectButton onConnect={connect} />
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 
                              border border-gray-700 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-green-400 
                                 shadow-[0_0_6px_#4ade80]" />
                <span className="font-mono text-xs text-gray-300">
                  {walletAddress
                    ? `${walletAddress.slice(0, 10)}…${walletAddress.slice(-6)}`
                    : "Connected"}
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Body ─────────────────────────────────────────────── */}
      {!connected ? (
        // Not connected: landing prompt
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-6">
          <div className="text-center space-y-3 max-w-md">
            <div className="w-16 h-16 bg-blue-600/20 border border-blue-600/40 rounded-2xl 
                            flex items-center justify-center mx-auto text-3xl">
              🔐
            </div>
            <h2 className="text-2xl font-bold">Multisig Vault</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              A two-contract system where funds locked in a vault script can only
              be spent when the required number of authorized signers sign the
              transaction — secured by an on-chain NFT state anchor.
            </p>
          </div>

          {/* How it works steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full mt-4">
            {[
              { icon: "🪙", title: "1. Initialize", desc: "Mint the state NFT and set authorized signers + threshold" },
              { icon: "💰", title: "2. Deposit", desc: "Anyone can lock ADA into the vault contract" },
              { icon: "✍️", title: "3. Spend", desc: "Collect required signatures off-chain, then submit" },
            ].map((step) => (
              <div
                key={step.title}
                className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2"
              >
                <span className="text-2xl">{step.icon}</span>
                <p className="font-semibold text-sm text-white">{step.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <WalletConnectButton onConnect={connect} large />
        </div>

      ) : showSetup ? (
        // Setup flow
        <div className="max-w-xl mx-auto px-6 py-10">
          <button
            onClick={() => setShowSetup(false)}
            className="text-sm text-gray-500 hover:text-gray-300 mb-6 flex items-center gap-1 
                       transition-colors"
          >
            ← Back
          </button>
          <SetupPanel
            lucid={lucid!}
            currentWalletAddress={walletAddress!}
            onComplete={handleSetupComplete}
          />
        </div>

      ) : !nftPolicyId ? (
        // Connected but no vault initialized yet
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6">
          <div className="text-center space-y-2">
            <p className="text-gray-400">No vault initialized yet.</p>
            <p className="text-gray-600 text-sm">
              Create a new vault or paste an existing NFT Policy ID below.
            </p>
          </div>

          {/* Allow loading existing vault by pasting policy ID */}
          <ExistingVaultInput onLoad={(id) => {
            localStorage.setItem("nftPolicyId", id);
            setNftPolicyId(id);
          }} />

          <button
            onClick={() => setShowSetup(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold 
                       rounded-xl transition-all"
          >
            Initialize New Vault
          </button>
        </div>

      ) : (
        // Main dashboard
        <VaultDashboard
          nftPolicyId={nftPolicyId}
          lucid={lucid}
          walletAddress={walletAddress}
          walletPkh={walletPkh}
          availableWallets={availableWallets}
          onSwitchWallet={connect}
        />
      )}
    </main>
  );
}


function WalletConnectButton({
  onConnect,
  large = false,
}: {
  onConnect: (w:  "eternl" | "typhon" | "lace") => void;
  large?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wallets = [ "eternl", "typhon", "lace"] as const;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl 
                    transition-all ${large ? "px-8 py-3 text-base" : "px-4 py-1.5 text-sm"}`}
      >
        Connect Wallet
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-44 bg-gray-800 border border-gray-700 
                          rounded-xl shadow-xl z-30 overflow-hidden">
            {wallets.map((w) => (
              <button
                key={w}
                onClick={() => { onConnect(w); setOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm capitalize text-gray-300 
                           hover:bg-gray-700 hover:text-white transition-colors"
              >
                {w.charAt(0).toUpperCase() + w.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Existing Vault Loader ─────────────────────────────────────────────────────
function ExistingVaultInput({ onLoad }: { onLoad: (id: string) => void }) {
  const [value, setValue] = useState("");
  const valid = value.length === 56; // policy IDs are 56 hex chars

  return (
    <div className="flex gap-2 w-full max-w-md">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.trim())}
        placeholder="Paste existing NFT Policy ID…"
        className="flex-1 px-3 py-2.5 bg-gray-900 border border-gray-700 rounded-xl 
                   text-white text-sm font-mono placeholder-gray-600 focus:border-blue-500 
                   focus:outline-none transition-colors"
      />
      <button
        onClick={() => onLoad(value)}
        disabled={!valid}
        className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl 
                   transition-all disabled:opacity-40"
      >
        Load
      </button>
    </div>
  );
}