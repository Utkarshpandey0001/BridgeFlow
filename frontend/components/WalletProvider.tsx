'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface WalletState {
    address: string | null;
    connected: boolean;
    connecting: boolean;
    connect: () => Promise<void>;
    disconnectWallet: () => void;
}

const WalletContext = createContext<WalletState>({
    address: null,
    connected: false,
    connecting: false,
    connect: async () => { },
    disconnectWallet: () => { },
});

export function useWallet() {
    return useContext(WalletContext);
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const [address, setAddress] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);

    // On mount, check if already connected from localStorage
    useEffect(() => {
        (async () => {
            try {
                const { isConnected, getLocalStorage } = await import('@stacks/connect');
                if (isConnected()) {
                    const data = getLocalStorage();
                    const stxAddr = data?.addresses?.stx?.[0]?.address;
                    if (stxAddr) {
                        setAddress(stxAddr);
                        setConnected(true);
                    }
                }
            } catch {
                // @stacks/connect not available
            }
        })();
    }, []);

    const connect = useCallback(async () => {
        setConnecting(true);
        try {
            const { request, isConnected, getLocalStorage } = await import('@stacks/connect');

            // Use the modern RPC request to get Stacks addresses
            // This pops up the wallet selection UI (Leather, Xverse, etc.)
            const response = await request('stx_getAddresses');

            if (response && response.addresses && response.addresses.length > 0) {
                // Prefer testnet address (starts with ST), fall back to first available
                const testnetAddr = response.addresses.find(
                    (a: { address: string }) => a.address.startsWith('ST')
                );
                const addr = testnetAddr?.address || response.addresses[0]?.address;

                if (addr) {
                    setAddress(addr);
                    setConnected(true);
                    setConnecting(false);
                    return;
                }
            }

            // Fallback: check localStorage if request didn't return addresses directly
            if (isConnected()) {
                const data = getLocalStorage();
                const stxAddr = data?.addresses?.stx?.[0]?.address;
                if (stxAddr) {
                    setAddress(stxAddr);
                    setConnected(true);
                }
            }
        } catch (err) {
            console.error('Wallet connect failed:', err);
        }
        setConnecting(false);
    }, []);

    const disconnectWallet = useCallback(async () => {
        try {
            const { disconnect } = await import('@stacks/connect');
            disconnect();
        } catch {
            // ignore
        }
        setAddress(null);
        setConnected(false);
    }, []);

    return (
        <WalletContext.Provider value={{ address, connected, connecting, connect, disconnectWallet }}>
            {children}
        </WalletContext.Provider>
    );
}
