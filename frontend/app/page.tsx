import { fetchMarketData } from '@/lib/stacks';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { ArrowRight, Shield, Zap, Trophy, Activity } from 'lucide-react';

async function getLiveMarket() {
  try {
    return await fetchMarketData();
  } catch {
    return { btcPriceUSD: 65000, btcVolatilityPct: 38.2, stacksUsdcApy: 8.4, baseAaveApy: 11.8, apySpreadBps: 340, timestamp: Date.now() };
  }
}

export default async function Home() {
  const market = await getLiveMarket();

  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-6">

        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="pt-24 pb-16 text-center fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0E1220] border border-[#1A2035] text-sm text-gray-400 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 pulse" />
            Live on Stacks Testnet • Powered by CCTP
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.1]" style={{ fontFamily: 'Space Grotesk' }}>
            Bitcoin-Native<br />
            <span className="gradient-text">Yield Intelligence</span>
          </h1>

          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Deposit USDCx into the Bitflow vault. Let your AI agent monitor both Stacks and Base yields —
            bridging programmatically via CCTP to maximize your returns while staying Bitcoin-aligned.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary flex items-center gap-2">
              Launch App <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/leaderboard" className="btn-ghost flex items-center gap-2">
              <Trophy className="w-4 h-4" /> View Leaderboard
            </Link>
          </div>
        </section>

        {/* ── Live Stats Banner ──────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-20 fade-up">
          {[
            { label: 'BTC Price', value: `$${market.btcPriceUSD.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, sub: 'Live via Pyth', color: 'text-[#F7931A]' },
            { label: 'Stacks APY', value: `${market.stacksUsdcApy.toFixed(1)}%`, sub: 'USDCx / Zest', color: 'text-green-400' },
            { label: 'Base Aave APY', value: `${market.baseAaveApy.toFixed(1)}%`, sub: 'USDC / Aave v3', color: 'text-blue-400' },
            { label: 'BTC Volatility', value: `${market.btcVolatilityPct.toFixed(1)}%`, sub: '30-day annualized', color: 'text-yellow-400' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-6 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`} style={{ fontFamily: 'Space Grotesk' }}>{s.value}</p>
              <p className="text-xs text-gray-600 mt-1">{s.sub}</p>
            </div>
          ))}
        </section>

        {/* ── How It Works ──────────────────────────────────────── */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'Space Grotesk' }}>How Bitflow Works</h2>
          <p className="text-center text-gray-500 mb-12">Three steps to autonomous yield optimization</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01', icon: Shield, color: 'green',
                title: 'Deposit USDCx',
                desc: 'Connect your Hiro wallet and deposit USDCx into the vault. Your funds are secured in an audited Clarity smart contract on Stacks.',
              },
              {
                step: '02', icon: Activity, color: 'blue',
                title: 'Configure Your Agent',
                desc: 'Choose Safe, Balanced, or Yield Chaser. Set your APY threshold, bridge percentage, and BTC volatility limits.',
              },
              {
                step: '03', icon: Zap, color: 'orange',
                title: 'Earn Automatically',
                desc: 'Your agent monitors yields every hour. When conditions are met, it programmatically bridges via CCTP to Base/Aave for higher returns.',
              },
            ].map(({ step, icon: Icon, color, title, desc }) => (
              <div key={step} className="glass-card p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl font-bold text-[#1A2035]" style={{ fontFamily: 'Space Grotesk' }}>{step}</span>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color === 'green' ? 'bg-green-400/10' : color === 'blue' ? 'bg-blue-400/10' : 'bg-orange-400/10'
                    }`}>
                    <Icon className={`w-5 h-5 ${color === 'green' ? 'text-green-400' : color === 'blue' ? 'text-blue-400' : 'text-[#F7931A]'
                      }`} />
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-3">{title}</h3>
                <p className="text-gray-500 leading-relaxed text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Agent Personalities Preview ───────────────────────── */}
        <section className="mb-24">
          <h2 className="text-3xl font-bold text-center mb-4" style={{ fontFamily: 'Space Grotesk' }}>Agent Personalities</h2>
          <p className="text-center text-gray-500 mb-12">Pick the strategy that matches your risk appetite</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { emoji: '🛡️', name: 'Safe Maximalist', risk: 'Low Risk', color: 'badge-green', desc: 'Stays mostly on Stacks. Bridges only when BTC is stable and yield spread is substantial.', stats: { bridge: '20%', vol: '<20%', minApy: '10%' } },
              { emoji: '⚖️', name: 'Balanced', risk: 'Medium Risk', color: 'badge-blue', desc: 'Intelligently splits allocation. Auto-bridges when Base Aave consistently outperforms Stacks.', stats: { bridge: '30%', vol: '<40%', minApy: '8%' } },
              { emoji: '🚀', name: 'Yield Chaser', risk: 'High Risk', color: 'badge-orange', desc: 'Maximizes yield above all else. Aggressively bridges up to 50% wherever APY is highest.', stats: { bridge: '50%', vol: 'Any', minApy: '5%' } },
            ].map((a) => (
              <div key={a.name} className="glass-card p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{a.emoji}</span>
                  <span className={`badge ${a.color}`}>{a.risk}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{a.name}</h3>
                  <p className="text-sm text-gray-500">{a.desc}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-[#1A2035]">
                  <div className="text-center"><p className="text-xs text-gray-600">Bridge</p><p className="text-sm font-semibold">{a.stats.bridge}</p></div>
                  <div className="text-center"><p className="text-xs text-gray-600">Max Vol</p><p className="text-sm font-semibold">{a.stats.vol}</p></div>
                  <div className="text-center"><p className="text-xs text-gray-600">Min APY</p><p className="text-sm font-semibold">{a.stats.minApy}</p></div>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/agent" className="btn-primary inline-flex items-center gap-2">
              Set Up Your Agent <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────── */}
        <footer className="border-t border-[#1A2035] py-8 text-center text-gray-600 text-sm">
          <p>Built with ❤️ on Stacks • Powered by CCTP • Secured by Bitcoin</p>
        </footer>
      </main>
    </>
  );
}
