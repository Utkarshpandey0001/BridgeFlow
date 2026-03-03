'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Check, ChevronRight, Info } from 'lucide-react';
import { AGENT_META } from '@/lib/stacks';
import { fetchDecision, type DecisionResult } from '@/lib/stacks';

type AgentType = 'safe' | 'balanced' | 'chaser';

export default function AgentPage() {
    const [selectedAgent, setSelectedAgent] = useState<AgentType>('balanced');
    const [minApy, setMinApy] = useState(8);
    const [bridgePct, setBridgePct] = useState(30);
    const [volThreshold, setVolThreshold] = useState(40);
    const [autoExecute, setAutoExecute] = useState(true);
    const [leaderboardOptin, setLeaderboardOptin] = useState(true);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [preview, setPreview] = useState<DecisionResult | null>(null);

    // Update sliders when agent type changes
    useEffect(() => {
        const meta = AGENT_META[selectedAgent];
        setMinApy(meta.minApyBps / 100);
        setBridgePct(meta.bridgePctBps / 100);
        setVolThreshold(meta.volThresholdBps / 100);
    }, [selectedAgent]);

    // Live decision preview
    useEffect(() => {
        fetchDecision(selectedAgent)
            .then(r => setPreview(r.decision))
            .catch(() => { });
    }, [selectedAgent]);

    const handleSave = async () => {
        setSaveStatus('saving');
        // In production: call vault contract set-user-rules via @stacks/connect
        await new Promise(r => setTimeout(r, 1200));
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const agents: { type: AgentType; emoji: string; label: string; risk: string; badgeClass: string; desc: string }[] = [
        { type: 'safe', emoji: '🛡️', label: 'Safe Maximalist', risk: 'Low Risk', badgeClass: 'badge-green', desc: 'Prioritizes capital safety & BTC alignment' },
        { type: 'balanced', emoji: '⚖️', label: 'Balanced', risk: 'Medium Risk', badgeClass: 'badge-blue', desc: 'Smart yield optimization with guardrails' },
        { type: 'chaser', emoji: '🚀', label: 'Yield Chaser', risk: 'High Risk', badgeClass: 'badge-orange', desc: 'Aggressive cross-chain yield maximization' },
    ];

    return (
        <>
            <Navbar />
            <main className="max-w-4xl mx-auto px-6 py-10 fade-up">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold" style={{ fontFamily: 'Space Grotesk' }}>Configure Agent</h1>
                    <p className="text-gray-500 text-sm mt-1">Set your agent personality and fine-tune parameters</p>
                </div>

                {/* Agent personality picker */}
                <div className="glass-card p-6 mb-6">
                    <h2 className="text-base font-semibold mb-4">Agent Personality</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        {agents.map((a) => (
                            <button
                                key={a.type}
                                onClick={() => setSelectedAgent(a.type)}
                                className={`relative p-5 rounded-xl border text-left transition-all duration-200 ${selectedAgent === a.type
                                        ? 'border-[#F7931A] bg-[rgba(247,147,26,0.06)]'
                                        : 'border-[#1A2035] bg-[#12172A] hover:border-[#2A3045]'
                                    }`}
                            >
                                {selectedAgent === a.type && (
                                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#F7931A] flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                    </div>
                                )}
                                <span className="text-2xl block mb-2">{a.emoji}</span>
                                <div className="font-semibold text-sm mb-1">{a.label}</div>
                                <span className={`badge ${a.badgeClass} mb-2`}>{a.risk}</span>
                                <p className="text-xs text-gray-600">{a.desc}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Advanced sliders */}
                <div className="glass-card p-6 mb-6">
                    <div className="flex items-center gap-2 mb-6">
                        <h2 className="text-base font-semibold">Advanced Parameters</h2>
                        <Info className="w-4 h-4 text-gray-600" />
                    </div>

                    <div className="space-y-8">
                        {/* Min APY */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-gray-400">Minimum Stacks APY before bridging</label>
                                <span className="text-sm font-semibold text-[#F7931A]">{minApy}%</span>
                            </div>
                            <input
                                type="range" min={1} max={20} step={0.5}
                                value={minApy}
                                onChange={e => setMinApy(parseFloat(e.target.value))}
                                className="w-full accent-[#F7931A]"
                            />
                            <div className="flex justify-between text-xs text-gray-700 mt-1">
                                <span>1% (Yield aggressive)</span><span>20% (Very conservative)</span>
                            </div>
                        </div>

                        {/* Bridge % */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-gray-400">Bridge percentage per trigger</label>
                                <span className="text-sm font-semibold text-blue-400">{bridgePct}%</span>
                            </div>
                            <input
                                type="range" min={5} max={50} step={5}
                                value={bridgePct}
                                onChange={e => setBridgePct(parseFloat(e.target.value))}
                                className="w-full accent-blue-500"
                            />
                            <div className="flex justify-between text-xs text-gray-700 mt-1">
                                <span>5% (Small moves)</span><span>50% (Max allowed)</span>
                            </div>
                        </div>

                        {/* BTC vol threshold */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm text-gray-400">Max BTC volatility to tolerate</label>
                                <span className="text-sm font-semibold text-green-400">{volThreshold >= 99 ? 'Any' : `${volThreshold}%`}</span>
                            </div>
                            <input
                                type="range" min={10} max={100} step={5}
                                value={volThreshold}
                                onChange={e => setVolThreshold(parseFloat(e.target.value))}
                                className="w-full accent-green-500"
                            />
                            <div className="flex justify-between text-xs text-gray-700 mt-1">
                                <span>10% (Very low vol only)</span><span>100% (Ignore vol)</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="glass-card p-6 mb-6">
                    <h2 className="text-base font-semibold mb-4">Options</h2>
                    <div className="space-y-4">
                        {[
                            { label: 'Auto-execute', desc: 'Agent automatically submits bridge transactions (requires pre-authorization)', state: autoExecute, setter: setAutoExecute },
                            { label: 'Leaderboard opt-in', desc: 'Share anonymized performance data with the global leaderboard', state: leaderboardOptin, setter: setLeaderboardOptin },
                        ].map(({ label, desc, state, setter }) => (
                            <div key={label} className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">{label}</p>
                                    <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                                </div>
                                <button
                                    onClick={() => setter(!state)}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${state ? 'bg-[#F7931A]' : 'bg-[#1A2035]'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${state ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live preview */}
                {preview && (
                    <div className={`p-4 rounded-xl border mb-6 ${preview.shouldBridge ? 'border-orange-400/20 bg-orange-400/5' : 'border-green-400/20 bg-green-400/5'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Current Decision Preview</span>
                            <span className={`badge ${preview.shouldBridge ? 'badge-orange' : 'badge-green'}`}>
                                {preview.shouldBridge ? '🔀 Bridge' : '✅ Hold'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-400">{preview.reason}</p>
                    </div>
                )}

                {/* Save */}
                <button onClick={handleSave} disabled={saveStatus === 'saving'} className="btn-primary w-full flex items-center justify-center gap-2">
                    {saveStatus === 'saving' ? 'Saving to chain…' : saveStatus === 'saved' ? '✓ Agent Activated!' : (
                        <><span>Activate Agent</span><ChevronRight className="w-4 h-4" /></>
                    )}
                </button>
            </main>
        </>
    );
}
