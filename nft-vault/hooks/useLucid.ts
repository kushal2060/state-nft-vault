"use client";
import { useState, useEffect } from "react";

type LucidInstance = any;

interface CardanoWallet {
  name: string;
  icon: string;
  apiVersion: string;
  enable: () => Promise<any>;
}

export function useLucid() {
    const [lucid, setLucid] = useState<LucidInstance | null>(null);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [walletPkh, setWalletPkh] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [availableWallets, setAvailableWallets] = useState<string[]>([]);
    const [connecting, setConnecting] = useState(false);

    // Detect installed wallets on mount
    useEffect(() => {
        const detectWallets = () => {
            if (typeof window === "undefined") {
                return;
            }

            const cardano = (window as any).cardano;
            if (!cardano) return;

            const walletKeys = [
                "eternl",
                "nami", 
                "flint",
                "typhon",
                "lace",
                "vespr",
                "yoroi",
                "gerowallet",
                "nufi"
            ];

            const installed = walletKeys.filter(
                (key) => cardano[key] !== undefined
            );

            setAvailableWallets(installed);
        };

     
        detectWallets();

      
        const timeout = setTimeout(detectWallets, 1000);

        return () => clearTimeout(timeout);
    }, []);

    const connect = async (walletName: string) => {
        const cardano = (window as any).cardano;
        
        if (!cardano?.[walletName]) {
            throw new Error(`${walletName} wallet not found. Please install it first.`);
        }

        setConnecting(true);
        
        try {
            // Dynamic import - only loads in browser
            const { Lucid, Blockfrost, getAddressDetails } = await import("@lucid-evolution/lucid");
            const api = await cardano[walletName].enable();
            const lucidInstance = await Lucid(
                new Blockfrost(
                    "https://cardano-preprod.blockfrost.io/api/v0",
                    process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY!
                ),
                "Preprod"
            );
            
            lucidInstance.selectWallet.fromAPI(api);
            const address = await lucidInstance.wallet().address();
            const { paymentCredential } = getAddressDetails(address);

            setLucid(lucidInstance);
            setWalletAddress(address);
            setWalletPkh(paymentCredential?.hash ?? null);
            setConnected(true);
        } catch (error: any) {
            console.error("Wallet connection error:", error);
            throw error;
        } finally {
            setConnecting(false);
        }
    };

    const disconnect = () => {
        setLucid(null);
        setWalletAddress(null);
        setWalletPkh(null);
        setConnected(false);
    };

    return { 
        lucid, 
        walletAddress, 
        walletPkh, 
        connected, 
        connecting,
        availableWallets,
        connect,
        disconnect
    };
}