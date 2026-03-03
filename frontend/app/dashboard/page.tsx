'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, GitFork, Zap } from 'lucide-react';
import { fetchMarketData, fetchDecision, type MarketData, type DecisionResult } from '@/lib/stacks';

const CHART_COLORS = ['#F7931A', '#3B82F6', '#22C55E'];

const yieldHistory = [
    { day: 'Day 1', yield: 0 },
    { day: 'Day 3', yield: 0.8 },
    { day: 'Day 7', yield: 1.6 },
    { day: 'Day 14', yield: 2.9 },
    { day: 'Day 21', yield: 3.8 },
    { day: 'Today', yield: 4.6 },
];

export default function DashboardPage() {
    const [market, setMarket] = useState<MarketData | null>(null);
    const [decision, setDecision] = useState<DecisionResult | null>(null);
    const [agentType,] = useState('balanced');
    const [vaultBalance] = useState(25000);
    const [bridgedAmount] = useState(7500);
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositStatus, setDepositStatus] = useState<'idle' | 'loading' | 'done'>('idle');

    const stacksAmt = vaultBalance - bridgedAmount;

    const allocationData = [
        { name: 'Stacks (Zest)', value: stacksAmt },
        { name: 'Base (Aave)', value: bridgedAmount },
    ];

    useEffect(() => {
        fetchMarketData().then(setMarket).catch(() => {
            setMarket({ btcPriceUSD: 65000, btcVolatilityPct: 38.2, stacksUsdcApy: 8.4, baseAaveApy: 11.8, apySpreadBps: 340, timestamp: Date.now() });
        });
        fetchDecision(agentType).then(r => setDecision(r.decision)).catch(() => {
            setDecision({ shouldBridge: false, bridgePctBps: 0, reason: 'Market conditions stable — holding on Stacks', confidence: 'HIGH', marketSnapshot: { btcVolPct: 38.2, stacksApyPct: 8.4, baseApyPct: 11.8, apySpreadBps: 340 } });
        });
    }, [agentType]);

    const handleDeposit = async () => {
        setDepositStatus('loading');
        await new Promise(r => setTimeout(r, 1500));
        setDepositStatus('done');
        setTimeout(() => { setShowDepositModal(false); setDepositStatus('idle'); setDepositAmount(''); }, 1500);
    };

    return (
        <>
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-10 fade-up">
                {/* Header row */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Dashboard</h1>
                        <p className="text-gray-500 text-sm mt-1">Your vault positions and agent activity</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowDepositModal(true)} className="btn-primary">+ Deposit</button>
                        <button className="btn-ghost">Withdraw</button>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Vault Balance', value: `$${vaultBalance.toLocaleString()}`, sub: 'USDCx', icon: Wallet, color: 'text-white' },
                        { label: 'On Stacks', value: `$${stacksAmt.toLocaleString()}`, sub: `${((stacksAmt / vaultBalance) * 100).toFixed(0)}% of portfolio`, icon: TrendingUp, color: 'text-green-400' },
                        { label: 'Bridged (Base)', value: `$${bridgedAmount.toLocaleString()}`, sub: 'Earning on Aave', icon: GitFork, color: 'text-blue-400' },
                        { label: 'Net Yield (Est.)', value: '+4.6%', sub: 'Since deposit', icon: Zap, color: 'text-[#F7931A]' },
                    ].map(({ label, value, sub, icon: Icon, color }) => (
                        <div key={label} className="stat-card">
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-xs text-gray-500 uppercase tracking-widest">{label}</p>
                                <Icon className={`w-4 h-4 ${color}`} />
                            </div>
                            <p className={`text-2xl font-bold ${color}`} style={{ fontFamily: 'Space Grotesk' }}>{value}</p>
                            <p className="text-xs text-gray-600 mt-1">{sub}</p>
                        </div>
                    ))}
                </div>

                {/* Charts row */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                    {/* Allocation pie */}
                    <div className="glass-card p-6">
                        <h2 className="text-base font-semibold mb-6">Allocation</h2>
                        <div className="flex items-center gap-6">
                            <ResponsiveContainer width={160} height={160}>
                                <PieChart>
                                    <Pie data={allocationData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                                        {allocationData.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-3">
                                {allocationData.map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i] }} />
                                            <span className="text-sm text-gray-400">{d.name}</span>
                                        </div>
                                        <span className="text-sm font-semibold">${d.value.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Yield history line */}
                    <div className="glass-card p-6">
                        <h2 className="text-base font-semibold mb-6">Yield History</h2>
                        <ResponsiveContainer width="100%" height={150}>
                            <LineChart data={yieldHistory} margin={{ top: 0, right: 8, bottom: 0, left: -24 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1A2035" />
                                <XAxis dataKey="day" tick={{ fill: '#6B7280', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: '#0E1220', border: '1px solid #1A2035', borderRadius: 8 }}
                                    labelStyle={{ color: '#9CA3AF' }}
                                    formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Yield']}
                                />
                                <Line type="monotone" dataKey="yield" stroke="#F7931A" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Agent decision + market */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Agent status */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-semibold">Agent Status</h2>
                            <span className="badge badge-blue">⚖️ Balanced</span>
                        </div>
                        {decision ? (
                            <>
                                <div className={`flex items-center gap-2 p-3 rounded-xl mb-4 ${decision.shouldBridge ? 'bg-orange-400/10 border border-orange-400/20' : 'bg-green-400/10 border border-green-400/20'}`}>
                                    {decision.shouldBridge
                                        ? <ArrowUpRight className="w-5 h-5 text-[#F7931A]" />
                                        : <ArrowDownRight className="w-5 h-5 text-green-400 rotate-180" />
                                    }
                                    <span className="text-sm font-medium">
                                        {decision.shouldBridge ? 'Bridge Recommended' : 'Hold on Stacks'}
                                    </span>
                                    <span className={`badge ml-auto ${decision.confidence === 'HIGH' ? 'badge-green' : decision.confidence === 'MEDIUM' ? 'badge-blue' : 'badge-orange'}`}>
                                        {decision.confidence}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 leading-relaxed">{decision.reason}</p>
                            </>
                        ) : (
                            <div className="h-16 flex items-center justify-center text-gray-600 text-sm">Loading agent state…</div>
                        )}
                    </div>

                    {/* Market snapshot */}
                    <div className="glass-card p-6">
                        <h2 className="text-base font-semibold mb-4">Market Snapshot</h2>
                        {market ? (
                            <div className="space-y-3">
                                {[
                                    { label: 'BTC Price', value: `$${market.btcPriceUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-[#F7931A]' },
                                    { label: 'BTC Volatility (30d)', value: `${market.btcVolatilityPct.toFixed(1)}%`, color: 'text-yellow-400' },
                                    { label: 'Stacks APY', value: `${market.stacksUsdcApy.toFixed(1)}%`, color: 'text-green-400' },
                                    { label: 'Base Aave APY', value: `${market.baseAaveApy.toFixed(1)}%`, color: 'text-blue-400' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="flex items-center justify-between py-2 border-b border-[#1A2035]">
                                        <span className="text-sm text-gray-500">{label}</span>
                                        <span className={`text-sm font-semibold ${color}`}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-600 text-sm">Fetching data…</div>
                        )}
                    </div>
                </div>

                {/* Deposit Modal */}
                {showDepositModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="glass-card w-full max-w-sm p-8">
                            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Deposit USDCx</h2>
                            <p className="text-sm text-gray-500 mb-6">Funds are deposited into the Bitflow vault on Stacks</p>
                            <input
                                type="number"
                                placeholder="Amount (USDCx)"
                                value={depositAmount}
                                onChange={e => setDepositAmount(e.target.value)}
                                className="w-full bg-[#12172A] border border-[#1A2035] rounded-xl px-4 py-3 text-white text-sm mb-4 outline-none focus:border-[#F7931A] transition-colors"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setShowDepositModal(false)} className="btn-ghost flex-1">Cancel</button>
                                <button
                                    onClick={handleDeposit}
                                    disabled={!depositAmount || depositStatus === 'loading'}
                                    className="btn-primary flex-1"
                                >
                                    {depositStatus === 'loading' ? 'Confirming…' : depositStatus === 'done' ? '✓ Deposited!' : 'Deposit'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
