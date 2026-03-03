// ============================================================
// Stacks contract interaction helpers
// ============================================================
'use client';

const AGENT_API = process.env.NEXT_PUBLIC_AGENT_SERVICE_URL || 'http://localhost:3001';

export interface MarketData {
    btcPriceUSD: number;
    btcVolatilityPct: number;
    stacksUsdcApy: number;
    baseAaveApy: number;
    apySpreadBps: number;
    timestamp: number;
}

export interface DecisionResult {
    shouldBridge: boolean;
    bridgePctBps: number;
    reason: string;
    confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    marketSnapshot: {
        btcVolPct: number;
        stacksApyPct: number;
        baseApyPct: number;
        apySpreadBps: number;
    };
}

export interface LeaderboardEntry {
    id: number;
    user_address: string;
    agent_label: string;
    agent_type: string;
    net_yield_pct: number;
    deposits_usdcx: number;
    bridges_made: number;
    created_at: string;
    last_updated: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────

export async function fetchMarketData(): Promise<MarketData> {
    const res = await fetch(`${AGENT_API}/api/market`, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error('Failed to fetch market data');
    return res.json();
}

export async function fetchDecision(agentType: string): Promise<{ agentType: string; decision: DecisionResult }> {
    const res = await fetch(`${AGENT_API}/api/decision/${agentType}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch decision');
    return res.json();
}

export async function fetchLeaderboard(): Promise<{ agents: LeaderboardEntry[]; count: number }> {
    const res = await fetch(`${AGENT_API}/api/leaderboard`, { next: { revalidate: 30 } });
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    return res.json();
}

export async function submitSnapshot(data: {
    userAddress: string;
    agentLabel: string;
    agentType: string;
    netYieldPct: number;
    depositsUsdcx: number;
    bridgesMade: number;
}): Promise<void> {
    await fetch(`${AGENT_API}/api/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });
}

// ─── Stacks Wallet helpers ────────────────────────────────────────────────

export function getVaultContract() {
    return {
        address: process.env.NEXT_PUBLIC_VAULT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        name: process.env.NEXT_PUBLIC_VAULT_NAME || 'vault',
    };
}

export function getUsdcContract() {
    return {
        address: process.env.NEXT_PUBLIC_USDC_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        name: process.env.NEXT_PUBLIC_USDC_NAME || 'usdc-token',
    };
}

// Agent type metadata
export const AGENT_META = {
    safe: {
        label: 'Safe Bitcoin Maximalist',
        emoji: '🛡️',
        color: 'green',
        description: 'Prioritizes capital safety. Bridges only when BTC volatility is low and yield gap is large.',
        minApyBps: 1000,
        bridgePctBps: 2000,
        volThresholdBps: 2000,
    },
    balanced: {
        label: 'Balanced Optimizer',
        emoji: '⚖️',
        color: 'blue',
        description: 'Balances risk and yield. Auto-bridges when conditions favor Base Aave over Stacks.',
        minApyBps: 800,
        bridgePctBps: 3000,
        volThresholdBps: 4000,
    },
    chaser: {
        label: 'Yield Chaser',
        emoji: '🚀',
        color: 'orange',
        description: 'Pure yield maximization. Aggressively bridges up to 50% wherever APY is highest.',
        minApyBps: 500,
        bridgePctBps: 5000,
        volThresholdBps: 9999,
    },
};
