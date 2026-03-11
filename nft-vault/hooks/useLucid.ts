"use client";
import { useState, useEffect } from "react";
import { Lucid, Blockfrost, getAddressDetails } from "@lucid-evolution/lucid";

export function useLucid(){
    const [lucid, setLucid] = useState<Awaited<ReturnType<typeof Lucid>> | null> (null);
    const [walletAddress, setWalletAddress]= useState<string | null>(null);
    const [walletPkh,setWalletPkh] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);

    const connect = async (walletName: "eternl" | "typhon" |"lace") => {
        const api = await (window as any).cardano[walletName].enable();
        const lucidInstance = await Lucid(
            new Blockfrost(
                "https://cardano-preprod.blockfrost.io/api/v0",
                process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY!
            ),
            "Preprod"
        );
        lucidInstance.selectWallet.fromAPI(api);

        const adddress = await lucidInstance.wallet().address();
        const {paymentCredential} = getAddressDetails(adddress);

        setLucid(lucidInstance);
        setWalletAddress(adddress);
        setWalletPkh(paymentCredential?.hash??null);
        setConnected(true);
    };
    return {lucid, walletAddress,walletPkh,connected,connect};

}