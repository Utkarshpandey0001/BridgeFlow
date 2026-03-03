// ===========================================================================
// Express Server — REST API for frontend and agent interaction
// ===========================================================================
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
dotenv.config();

import { getMarketData } from './oracle';
import { evaluate, getPresetRules, AgentType } from './decision';
import { initDb, getLeaderboard, upsertSnapshot, logBridgeEvent } from './leaderboard';
import { executeBridge } from './executor';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'bitflow-agent', timestamp: Date.now() });
});

// GET /api/market — current oracle data
app.get('/api/market', async (_req, res) => {
    try {
        const data = await getMarketData();
        res.json({
            btcPriceUSD: data.btcPriceUSD,
            btcVolatilityPct: Math.round(data.btcVolatilityPct * 1000) / 10,
            stacksUsdcApy: data.stacksUsdcApyBps / 100,
            baseAaveApy: data.baseAaveApyBps / 100,
            apySpreadBps: data.baseAaveApyBps - data.stacksUsdcApyBps,
            timestamp: data.timestamp,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/decision/:agentType — dry-run decision for a preset agent type
// agentType: safe | balanced | chaser
app.get('/api/decision/:agentType', async (req, res) => {
    const agentType = req.params.agentType as AgentType;
    if (!['safe', 'balanced', 'chaser'].includes(agentType)) {
        return res.status(400).json({ error: 'Invalid agent type. Use: safe | balanced | chaser' });
    }
    try {
        const market = await getMarketData();
        const rules = getPresetRules(agentType, false);
        const decision = evaluate(rules, market);
        res.json({ agentType, decision });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/decision — custom rules decision
app.post('/api/decision', async (req, res) => {
    const { agentType, minApyBps, bridgePctBps, volThresholdBps } = req.body;
    if (!agentType) return res.status(400).json({ error: 'agentType required' });
    try {
        const market = await getMarketData();
        const rules = {
            agentType: agentType as AgentType,
            minApyBps: minApyBps || 800,
            bridgePctBps: bridgePctBps || 3000,
            volThresholdBps: volThresholdBps || 4000,
            autoExecute: false,
        };
        const decision = evaluate(rules, market);
        res.json({ decision, market });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/leaderboard — top agents by net yield
app.get('/api/leaderboard', (_req, res) => {
    try {
        const agents = getLeaderboard(10);
        res.json({ agents, count: agents.length });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/snapshot — update a user's performance record
app.post('/api/snapshot', (req, res) => {
    const { userAddress, agentLabel, agentType, netYieldPct, depositsUsdcx, bridgesMade } = req.body;
    if (!userAddress || !agentType) {
        return res.status(400).json({ error: 'userAddress and agentType required' });
    }
    upsertSnapshot({
        userAddress,
        agentLabel: agentLabel || `Agent ${userAddress.slice(0, 6)}`,
        agentType,
        netYieldPct: netYieldPct || 0,
        depositsUsdcx: depositsUsdcx || 0,
        bridgesMade: bridgesMade || 0,
    });
    res.json({ success: true });
});

// POST /api/execute — trigger bridge for a user (called by cron or user action)
app.post('/api/execute', async (req, res) => {
    const { userAddress, agentType, reason } = req.body;
    if (!userAddress || !agentType) {
        return res.status(400).json({ error: 'userAddress and agentType required' });
    }
    try {
        const market = await getMarketData();
        const rules = getPresetRules(agentType as AgentType, true);
        const decision = evaluate(rules, market);

        if (!decision.shouldBridge) {
            return res.json({
                executed: false,
                reason: decision.reason,
                confidence: decision.confidence,
            });
        }

        const result = await executeBridge(userAddress, reason || decision.reason);

        if (result.success) {
            logBridgeEvent(userAddress, result.txId!, 0, decision.reason, result.simulated);
        }

        res.json({
            executed: result.success,
            txId: result.txId,
            simulated: result.simulated,
            decision,
            error: result.error,
        });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
export function startServer() {
    initDb();
    app.listen(PORT, () => {
        console.log(`\n🚀 Bitflow Agent Service running on http://localhost:${PORT}`);
        console.log(`   GET  /api/market          — oracle data`);
        console.log(`   GET  /api/decision/:type  — dry-run decision`);
        console.log(`   GET  /api/leaderboard     — top agents`);
        console.log(`   POST /api/execute         — trigger bridge\n`);
    });
}

startServer();

export default app;
