// ===========================================================================
// Leaderboard — SQLite-backed performance tracking for opt-in agents
// ===========================================================================
import Database from 'better-sqlite3';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const DB_PATH = process.env.SQLITE_PATH || path.join(__dirname, '../../data/bitflow.db');

let db: Database.Database;

export interface AgentRecord {
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

export interface SnapshotInput {
    userAddress: string;
    agentLabel: string;
    agentType: string;
    netYieldPct: number;
    depositsUsdcx: number;
    bridgesMade: number;
}

// ---------------------------------------------------------------------------
// Init DB
// ---------------------------------------------------------------------------
export function initDb(): void {
    db = new Database(DB_PATH);

    // Create agents table
    db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_address  TEXT NOT NULL UNIQUE,
      agent_label   TEXT NOT NULL,
      agent_type    TEXT NOT NULL DEFAULT 'balanced',
      net_yield_pct REAL NOT NULL DEFAULT 0,
      deposits_usdcx REAL NOT NULL DEFAULT 0,
      bridges_made  INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      last_updated  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

    // Create bridge_events log
    db.exec(`
    CREATE TABLE IF NOT EXISTS bridge_log (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      user_address  TEXT NOT NULL,
      tx_id         TEXT,
      amount_usdcx  REAL,
      reason        TEXT,
      simulated     INTEGER DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

    seedDemoData();
    console.log('[leaderboard] DB initialized at', DB_PATH);
}

// ---------------------------------------------------------------------------
// Seed demo agents for leaderboard
// ---------------------------------------------------------------------------
function seedDemoData(): void {
    const count = (db.prepare('SELECT COUNT(*) as c FROM agents').get() as any).c;
    if (count > 0) return; // already seeded

    const demos: SnapshotInput[] = [
        { userAddress: 'SP1ABC123DEMO1XXXXXXXXXXXXXXXXXXXXXX', agentLabel: 'Alpha Chaser', agentType: 'chaser', netYieldPct: 6.82, depositsUsdcx: 50000, bridgesMade: 8 },
        { userAddress: 'SP2DEF456DEMO2XXXXXXXXXXXXXXXXXXXXXX', agentLabel: 'Steady Eddie', agentType: 'balanced', netYieldPct: 5.14, depositsUsdcx: 25000, bridgesMade: 5 },
        { userAddress: 'SP3GHI789DEMO3XXXXXXXXXXXXXXXXXXXXXX', agentLabel: 'BTC Maxi', agentType: 'safe', netYieldPct: 4.32, depositsUsdcx: 100000, bridgesMade: 2 },
        { userAddress: 'SP4JKL012DEMO4XXXXXXXXXXXXXXXXXXXXXX', agentLabel: 'DeFi Degen', agentType: 'chaser', netYieldPct: 3.97, depositsUsdcx: 10000, bridgesMade: 12 },
        { userAddress: 'SP5MNO345DEMO5XXXXXXXXXXXXXXXXXXXXXX', agentLabel: 'Risk Manager', agentType: 'balanced', netYieldPct: 3.55, depositsUsdcx: 75000, bridgesMade: 4 },
    ];

    const insert = db.prepare(`
    INSERT OR IGNORE INTO agents (user_address, agent_label, agent_type, net_yield_pct, deposits_usdcx, bridges_made)
    VALUES (@userAddress, @agentLabel, @agentType, @netYieldPct, @depositsUsdcx, @bridgesMade)
  `);
    for (const d of demos) insert.run(d);
    console.log('[leaderboard] Seeded 5 demo agents');
}

// ---------------------------------------------------------------------------
// Leaderboard queries
// ---------------------------------------------------------------------------
export function getLeaderboard(limit = 10): AgentRecord[] {
    return db.prepare(
        'SELECT * FROM agents ORDER BY net_yield_pct DESC LIMIT ?'
    ).all(limit) as AgentRecord[];
}

export function upsertSnapshot(data: SnapshotInput): void {
    db.prepare(`
    INSERT INTO agents (user_address, agent_label, agent_type, net_yield_pct, deposits_usdcx, bridges_made)
    VALUES (@userAddress, @agentLabel, @agentType, @netYieldPct, @depositsUsdcx, @bridgesMade)
    ON CONFLICT(user_address) DO UPDATE SET
      net_yield_pct = @netYieldPct,
      deposits_usdcx = @depositsUsdcx,
      bridges_made = @bridgesMade,
      last_updated = datetime('now')
  `).run(data);
}

export function logBridgeEvent(
    userAddress: string,
    txId: string,
    amountUsdcx: number,
    reason: string,
    simulated: boolean
): void {
    db.prepare(`
    INSERT INTO bridge_log (user_address, tx_id, amount_usdcx, reason, simulated)
    VALUES (?, ?, ?, ?, ?)
  `).run(userAddress, txId, amountUsdcx, reason, simulated ? 1 : 0);
}

export function getDb(): Database.Database {
    return db;
}
