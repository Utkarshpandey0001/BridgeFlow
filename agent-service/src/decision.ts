// ===========================================================================
// Decision Engine — Determines whether to bridge based on user rules
// ===========================================================================
import { MarketData } from './oracle';

export type AgentType = 'safe' | 'balanced' | 'chaser';

export interface UserRules {
    agentType: AgentType;
    minApyBps: number;       // min APY needed on Stacks to stay (e.g. 800 = 8%)
    bridgePctBps: number;    // what % of balance to bridge (e.g. 3000 = 30%)
    volThresholdBps: number; // max BTC vol to tolerate (e.g. 4000 = 40%)
    autoExecute: boolean;
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

// Preset rules per agent personality
export const PRESET_RULES: Record<AgentType, Omit<UserRules, 'autoExecute'>> = {
    safe: {
        agentType: 'safe',
        minApyBps: 1000,       // Need 10% on Stacks before considering bridge
        bridgePctBps: 2000,    // Only bridge 20%
        volThresholdBps: 2000, // Won't bridge if BTC vol > 20%
    },
    balanced: {
        agentType: 'balanced',
        minApyBps: 800,        // 8% min APY
        bridgePctBps: 3000,    // Bridge 30%
        volThresholdBps: 4000, // Bridge if vol < 40%
    },
    chaser: {
        agentType: 'chaser',
        minApyBps: 500,        // Only needs 5% on Stacks
        bridgePctBps: 5000,    // Bridge 50%
        volThresholdBps: 9999, // Ignores vol — chases yield at all costs
    },
};

export function evaluate(rules: UserRules, market: MarketData): DecisionResult {
    const btcVolBps = Math.round(market.btcVolatilityPct * 10000);
    const stacksApyBps = market.stacksUsdcApyBps;
    const baseApyBps = market.baseAaveApyBps;
    const apySpreadBps = baseApyBps - stacksApyBps;

    const snapshot = {
        btcVolPct: Math.round(market.btcVolatilityPct * 1000) / 10,
        stacksApyPct: stacksApyBps / 100,
        baseApyPct: baseApyBps / 100,
        apySpreadBps,
    };

    // ─── Condition checks ───────────────────────────────────────────────────
    const volOk = btcVolBps <= rules.volThresholdBps;
    const apySpreadPositive = apySpreadBps > 0;
    const stacksApyBelowMin = stacksApyBps < rules.minApyBps;

    // Bridge logic: Base yield must beat Stacks AND vol must be acceptable
    // AND Stacks APY must be below user's minimum threshold
    const bridge =
        volOk &&
        apySpreadPositive &&
        stacksApyBelowMin;

    // Build human-readable reason
    let reason: string;
    let confidence: DecisionResult['confidence'];

    if (!bridge) {
        if (!volOk) {
            reason = `BTC vol ${snapshot.btcVolPct}% exceeds ${rules.volThresholdBps / 100}% threshold — staying safe on Stacks`;
            confidence = 'HIGH';
        } else if (!stacksApyBelowMin) {
            reason = `Stacks APY ${snapshot.stacksApyPct}% ≥ min ${rules.minApyBps / 100}% — no bridge needed`;
            confidence = 'HIGH';
        } else {
            reason = `Base APY ${snapshot.baseApyPct}% ≤ Stacks APY — no yield advantage`;
            confidence = 'MEDIUM';
        }
        return { shouldBridge: false, bridgePctBps: 0, reason, confidence, marketSnapshot: snapshot };
    }

    // Determine confidence based on spread magnitude
    if (apySpreadBps > 400) confidence = 'HIGH';
    else if (apySpreadBps > 150) confidence = 'MEDIUM';
    else confidence = 'LOW';

    reason = `Base APY ${snapshot.baseApyPct}% beats Stacks ${snapshot.stacksApyPct}% by ${apySpreadBps}bps. BTC vol ${snapshot.btcVolPct}% is acceptable. Bridging ${rules.bridgePctBps / 100}%.`;

    return {
        shouldBridge: true,
        bridgePctBps: rules.bridgePctBps,
        reason,
        confidence,
        marketSnapshot: snapshot,
    };
}

// Helper to get rules by agent type preset
export function getPresetRules(agentType: AgentType, autoExecute = true): UserRules {
    return { ...PRESET_RULES[agentType], autoExecute };
}
