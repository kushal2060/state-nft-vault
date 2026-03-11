import { MultisigDatum } from "@/lib/types";

interface Props {
  datum: MultisigDatum;
  currentWalletPkh?: string | null;
}

export default function SignerStatus({ datum, currentWalletPkh }: Props) {
  return (
    <div className="space-y-4">

      {/* Threshold badge */}
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 bg-blue-900/40 border border-blue-700/50 rounded-lg">
          <span className="text-blue-300 text-sm font-bold">
            {datum.threshold} of {datum.signers.length}
          </span>
        </div>
        <span className="text-gray-500 text-sm">signatures required to spend</span>
      </div>

      {/* Signer list */}
      <div className="space-y-2">
        <p className="text-xs text-gray-600 uppercase tracking-wider">Authorized Signers</p>
        {datum.signers.map((pkh, i) => {
          const isYou = pkh === currentWalletPkh;
          return (
            <div
              key={pkh}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm
                border ${isYou
                  ? "bg-yellow-900/20 border-yellow-700/40"
                  : "bg-gray-800/60 border-gray-700/40"
                }`}
            >
              <span className="font-mono text-gray-300 text-xs tracking-wide">
                {pkh.slice(0, 14)}…{pkh.slice(-8)}
              </span>
              {isYou && (
                <span className="text-xs px-2 py-0.5 bg-yellow-600/30 text-yellow-400 
                                 rounded-full border border-yellow-600/30">
                  you
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}