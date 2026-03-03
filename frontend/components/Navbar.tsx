'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Zap, BarChart3, Trophy, Settings } from 'lucide-react';

export default function Navbar() {
    const pathname = usePathname();
    const [walletAddr, setWalletAddr] = useState<string | null>(null);

    const connectWallet = async () => {
        try {
            const { showConnect } = await import('@stacks/connect');
            showConnect({
                appDetails: { name: 'Bitflow', icon: '/favicon.ico' },
                onFinish: (data: any) => {
                    const addr = data.userSession?.loadUserData()?.profile?.stxAddress?.testnet
                        || data.userSession?.loadUserData()?.profile?.stxAddress?.mainnet;
                    setWalletAddr(addr || 'Connected');
                },
                onCancel: () => { },
                redirectTo: '/',
            });
        } catch {
            // Fallback for demo: mock connection
            setWalletAddr('SP1DEMO...ABC');
        }
    };

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
        { href: '/agent', label: 'Agent', icon: Settings },
        { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    ];

    return (
        <nav className="sticky top-0 z-50 border-b border-[#1A2035] bg-[#080B14]/90 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F7931A] to-[#E88010] flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="font-bold text-lg tracking-tight" style={{ fontFamily: 'Space Grotesk' }}>
                        Bit<span className="text-[#F7931A]">flow</span>
                    </span>
                </Link>

                {/* Nav links */}
                <div className="hidden md:flex items-center gap-6">
                    {navItems.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`nav-link flex items-center gap-1.5 ${pathname === href ? 'active !text-white' : ''}`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </Link>
                    ))}
                </div>

                {/* Wallet connect */}
                <div className="flex items-center gap-3">
                    {walletAddr ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0E1220] border border-[#1A2035]">
                            <div className="w-2 h-2 rounded-full bg-green-400 pulse" />
                            <span className="text-sm text-gray-300 font-mono">
                                {walletAddr.slice(0, 6)}…{walletAddr.slice(-4)}
                            </span>
                        </div>
                    ) : (
                        <button onClick={connectWallet} className="btn-primary text-sm !py-2 !px-4">
                            Connect Wallet
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
