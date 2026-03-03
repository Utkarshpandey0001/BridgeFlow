// ===========================================================================
// Cron Job — Runs agent decision loop every hour
// ===========================================================================
import * as cron from 'node-cron';
import * as dotenv from 'dotenv';
dotenv.config();

import { getMarketData } from './oracle';
import { evaluate, getPresetRules, AgentType } from './decision';
import { executeBridge } from './executor';
import { initDb, logBridgeEvent } from './leaderboard';

// Example registered users (in production, read from DB or contract events)
interface RegisteredUser {
    address: string;
    agentType: AgentType;
    label: string;
}

const REGISTERED_USERS: RegisteredUser[] = [
    { address: 'SP1ABC123DEMO1XXXXXXXXXXXXXXXXXXXXXX', agentType: 'chaser', label: 'Alpha Chaser' },
    { address: 'SP2DEF456DEMO2XXXXXXXXXXXXXXXXXXXXXX', agentType: 'balanced', label: 'Steady Eddie' },
    { address: 'SP3GHI789DEMO3XXXXXXXXXXXXXXXXXXXXXX', agentType: 'safe', label: 'BTC Maxi' },
];

async function runAgentLoop(): Promise<void> {
    console.log(`\n[cron] ⏱ Agent loop starting at ${new Date().toISOString()}`);
    const market = await getMarketData();
    console.log(`[cron] Market: BTC $${market.btcPriceUSD.toFixed(0)} | Vol: ${(market.btcVolatilityPct * 100).toFixed(1)}% | Stacks APY: ${market.stacksUsdcApyBps / 100}% | Base Aave APY: ${market.baseAaveApyBps / 100}%`);

    for (const user of REGISTERED_USERS) {
        const rules = getPresetRules(user.agentType, true);
        const decision = evaluate(rules, market);

        console.log(`[cron] ${user.label} (${user.agentType}): ${decision.shouldBridge ? '✅ BRIDGE' : '⏸ HOLD'} — ${decision.reason}`);

        if (decision.shouldBridge) {
            const result = await executeBridge(user.address, decision.reason);
            if (result.success) {
                logBridgeEvent(user.address, result.txId!, 0, decision.reason, result.simulated);
                console.log(`[cron]   → Bridge tx: ${result.txId} (${result.simulated ? 'simulated' : 'on-chain'})`);
            } else {
                console.error(`[cron]   → Bridge FAILED: ${result.error}`);
            }
        }
    }

    console.log('[cron] Loop complete\n');
}

// Initialize and start cron
initDb();

// Run immediately on start
runAgentLoop().catch(console.error);

// Then every hour: '0 * * * *'
// For demo/dev: every 5 minutes: '*/5 * * * *'
const schedule = process.env.CRON_SCHEDULE || '0 * * * *';
cron.schedule(schedule, () => {
    runAgentLoop().catch(console.error);
});

console.log(`[cron] Agent scheduler started (${schedule})`);
