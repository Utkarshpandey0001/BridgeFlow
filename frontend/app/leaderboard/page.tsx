'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import { Trophy, RefreshCw, TrendingUp } from 'lucide-react';
import { fetchLeaderboard, type LeaderboardEntry } from '@/lib/stacks';

const AGENT_COLORS: Record<string, string> = {
    safe: 'badge-green',
    balanced: 'badge-blue',
    chaser: 'badge-orange',
};

const AGENT_EMOJI: Record<string, string> = {
    safe: '🛡️',
    balanced: '⚖️',
    chaser: '🚀',
};

const RANK_MEDALS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPage() {
    const [agents, setAgents] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchLeaderboard();
            setAgents(data.agents);
            setLastUpdated(new Date());
        } catch {
            // Fallback mock data
            setAgents([
                { id: 1, user_address: 'SP1ABC123DEMO1XXXXXXXXXXXXXXXXXXXXXX', agent_label: 'Alpha Chaser', agent_type: 'chaser', net_yield_pct: 6.82, deposits_usdcx: 50000, bridges_made: 8, created_at: '2026-02-01', last_updated: new Date().toISOString() },
                { id: 2, user_address: 'SP2DEF456DEMO2XXXXXXXXXXXXXXXXXXXXXX', agent_label: 'Steady Eddie', agent_type: 'balanced', net_yield_pct: 5.14, deposits_usdcx: 25000, bridges_made: 5, created_at: '2026-02-05', last_updated: new Date().toISOString() },
                { id: 3, user_address: 'SP3GHI789DEMO3XXXXXXXXXXXXXXXXXXXXXX', agent_label: 'BTC Maxi', agent_type: 'safe', net_yield_pct: 4.32, deposits_usdcx: 100000, bridges_made: 2, created_at: '2026-01-28', last_updated: new Date().toISOString() },
                { id: 4, user_address: 'SP4JKL012DEMO4XXXXXXXXXXXXXXXXXXXXXX', agent_label: 'DeFi Degen', agent_type: 'chaser', net_yield_pct: 3.97, deposits_usdcx: 10000, bridges_made: 12, created_at: '2026-02-10', last_updated: new Date().toISOString() },
                { id: 5, user_address: 'SP5MNO345DEMO5XXXXXXXXXXXXXXXXXXXXXX', agent_label: 'Risk Manager', agent_type: 'balanced', net_yield_pct: 3.55, deposits_usdcx: 75000, bridges_made: 4, created_at: '2026-02-03', last_updated: new Date().toISOString() },
            ]);
            setLastUpdated(new Date());
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30_000); // refresh every 30s
        return () => clearInterval(interval);
    }, [load]);

    const top3 = agents.slice(0, 3);
    const rest = agents.slice(3);

    return (
        <>
            <Navbar />
            <main className="max-w-5xl mx-auto px-6 py-10 fade-up">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2" style={{ fontFamily: 'Space Grotesk' }}>
                            <Trophy className="w-8 h-8 text-[#F7931A]" /> Leaderboard
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Top opt-in agents ranked by net yield • Auto-refreshes every 30s
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastUpdated && (
                            <span className="text-xs text-gray-600">Updated {lastUpdated.toLocaleTimeString()}</span>
                        )}
                        <button onClick={load} className="btn-ghost !p-2" title="Refresh">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Top 3 podium cards */}
                {top3.length > 0 && (
                    <div className="grid md:grid-cols-3 gap-4 mb-8">
                        {top3.map((agent, i) => (
                            <div
                                key={agent.id}
                                className={`glass-card p-6 text-center relative overflow-hidden ${i === 0 ? 'border-[#F7931A]/30 bg-gradient-to-b from-[rgba(247,147,26,0.05)] to-transparent' : ''}`}
                            >
                                {i === 0 && (
                                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#F7931A] to-transparent" />
                                )}
                                <div className="text-3xl mb-2">{RANK_MEDALS[i + 1] || `#${i + 1}`}</div>
                                <div className="text-2xl mb-1">{AGENT_EMOJI[agent.agent_type] || '🤖'}</div>
                                <p className="font-semibold text-sm mb-1">{agent.agent_label}</p>
                                <p className="text-xs text-gray-600 font-mono mb-3">
                                    {agent.user_address.slice(0, 8)}…{agent.user_address.slice(-4)}
                                </p>
                                <div className={`text-2xl font-bold mb-1 ${i === 0 ? 'gradient-text' : 'text-green-400'}`} style={{ fontFamily: 'Space Grotesk' }}>
                                    +{agent.net_yield_pct.toFixed(2)}%
                                </div>
                                <p className="text-xs text-gray-600">net yield</p>
                                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[#1A2035]">
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600">Bridges</p>
                                        <p className="text-sm font-semibold">{agent.bridges_made}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-600">Deposited</p>
                                        <p className="text-sm font-semibold">${(agent.deposits_usdcx / 1000).toFixed(0)}k</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Full table */}
                <div className="glass-card overflow-hidden">
                    <div className="p-4 border-b border-[#1A2035] flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-[#F7931A]" />
                        <span className="text-sm font-semibold">All Agents</span>
                        <span className="text-xs text-gray-600 ml-auto">{agents.length} opt-in agents</span>
                    </div>
                    {loading && agents.length === 0 ? (
                        <div className="py-16 text-center text-gray-600 text-sm">Loading leaderboard…</div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Agent</th>
                                    <th>Type</th>
                                    <th>Net Yield</th>
                                    <th>TVL</th>
                                    <th>Bridges</th>
                                    <th>Since</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agents.map((agent, i) => (
                                    <tr key={agent.id}>
                                        <td>
                                            <span className="font-semibold text-gray-300">
                                                {RANK_MEDALS[i + 1] || `#${i + 1}`}
                                            </span>
                                        </td>
                                        <td>
                                            <div>
                                                <p className="font-medium text-sm">{agent.agent_label}</p>
                                                <p className="text-xs text-gray-600 font-mono">
                                                    {agent.user_address.slice(0, 10)}…
                                                </p>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${AGENT_COLORS[agent.agent_type] || 'badge-blue'}`}>
                                                {AGENT_EMOJI[agent.agent_type] || '🤖'} {agent.agent_type}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="font-bold text-green-400">+{agent.net_yield_pct.toFixed(2)}%</span>
                                        </td>
                                        <td>
                                            <span className="text-sm text-gray-300">${agent.deposits_usdcx >= 1000 ? `${(agent.deposits_usdcx / 1000).toFixed(0)}k` : agent.deposits_usdcx}</span>
                                        </td>
                                        <td>
                                            <span className="text-sm text-gray-400">{agent.bridges_made}</span>
                                        </td>
                                        <td>
                                            <span className="text-xs text-gray-600">
                                                {new Date(agent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* CTA to join */}
                <div className="mt-8 glass-card p-6 text-center">
                    <p className="text-sm text-gray-500 mb-3">Want to appear on the leaderboard?</p>
                    <p className="text-xs text-gray-700">Configure your agent, deposit USDCx, and enable leaderboard opt-in in Agent settings</p>
                </div>
            </main>
        </>
    );
}
