"use client";
import { useState } from "react";

interface Props {
  onDeposit: (amount: bigint) => Promise<void>;
  loading: boolean;
}

export default function DepositForm({ onDeposit, loading }: Props) {
  const [amount, setAmount] = useState("");

  const lovelace = BigInt(Math.floor(parseFloat(amount || "0") * 1_000_000));
  const valid = lovelace >= 2_000_000n;

  const handleDeposit = async () => {
    await onDeposit(lovelace);
    setAmount("");
  };

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          type="number"
          min="2"
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl 
                     text-white text-sm placeholder-gray-600 focus:border-blue-500 
                     focus:outline-none transition-colors pr-14"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
          ADA
        </span>
      </div>
      <button
        onClick={handleDeposit}
        disabled={loading || !valid}
        className="px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm 
                   font-semibold transition-all disabled:opacity-40 whitespace-nowrap"
      >
        {loading ? "…" : "Deposit"}
      </button>
    </div>
  );
}