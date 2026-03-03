// ===========================================================================
// Oracle — Fetches BTC price from Pyth + APY data from Zest/Aave
// ===========================================================================
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

const PYTH_API_URL = process.env.PYTH_API_URL || 'https://hermes.pyth.network/api';
// BTC/USD Pyth price feed ID
const BTC_USD_FEED_ID = '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43';

export interface MarketData {
    btcPriceUSD: number;
    btcVolatilityPct: number;   // annualized vol as decimal (e.g. 0.45 = 45%)
    stacksUsdcApyBps: number;   // in basis points (e.g. 820 = 8.2%)
    baseAaveApyBps: number;     // in basis points (e.g. 1180 = 11.8%)
    timestamp: number;
}

// ---------------------------------------------------------------------------
// BTC Price & Volatility
// ---------------------------------------------------------------------------
let priceHistory: number[] = [];

export async function fetchBtcPriceUSD(): Promise<number> {
    try {
        const url = `${PYTH_API_URL}/latest_price_feeds?ids[]=${BTC_USD_FEED_ID}`;
        const resp = await axios.get(url, { timeout: 5000 });
        const feed = resp.data?.[0];
        if (!feed) throw new Error('No price feed returned');
        // Pyth price is in expo format: price * 10^expo
        const price = parseFloat(feed.price.price);
        const expo = feed.price.expo;
        return price * Math.pow(10, expo);
    } catch {
        // Fallback mock price for demo
        console.warn('[oracle] Pyth unavailable, using mock BTC price');
        return 65_000 + (Math.random() - 0.5) * 2000;
    }
}

export function computeVolatility(prices: number[]): number {
    if (prices.length < 2) return 0.35; // default 35% annualized
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const dailyStdDev = Math.sqrt(variance);
    return dailyStdDev * Math.sqrt(365); // annualize
}

export async function getBtcVolatility(): Promise<number> {
    const price = await fetchBtcPriceUSD();
    priceHistory.push(price);
    if (priceHistory.length > 30) priceHistory.shift(); // keep 30 data points
    return computeVolatility(priceHistory);
}

// ---------------------------------------------------------------------------
// Yield Sources
// ---------------------------------------------------------------------------
export async function fetchStacksUsdcApyBps(): Promise<number> {
    try {
        // Zest Protocol API (or Granite) - attempt real fetch
        const resp = await axios.get('https://app.zestprotocol.com/api/v1/pools', { timeout: 5000 });
        const usdcPool = resp.data?.pools?.find((p: any) =>
            p.asset?.symbol?.toLowerCase().includes('usdc')
        );
        if (usdcPool?.apy) {
            return Math.round(usdcPool.apy * 100); // convert pct to bps
        }
    } catch {
        // ignore
    }
    // Fallback: realistic simulated APY 7-10%
    return 750 + Math.floor(Math.random() * 250);
}

export async function fetchBaseAaveApyBps(): Promise<number> {
    try {
        // Aave v3 Base subgraph
        const query = `{
      reserves(where: {symbol: "USDC"}) {
        liquidityRate
        symbol
      }
    }`;
        const resp = await axios.post(
            'https://api.thegraph.com/subgraphs/name/aave/protocol-v3-base',
            { query },
            { timeout: 5000 }
        );
        const reserve = resp.data?.data?.reserves?.[0];
        if (reserve?.liquidityRate) {
            // Aave rates are in ray (1e27)
            const aptBps = Math.round((parseFloat(reserve.liquidityRate) / 1e27) * 10000);
            return aptBps;
        }
    } catch {
        // ignore
    }
    // Fallback: realistic 10-14% APY
    return 1000 + Math.floor(Math.random() * 400);
}

// ---------------------------------------------------------------------------
// Aggregate market data
// ---------------------------------------------------------------------------
export async function getMarketData(): Promise<MarketData> {
    const [btcVol, stacksApy, baseApy, btcPrice] = await Promise.all([
        getBtcVolatility(),
        fetchStacksUsdcApyBps(),
        fetchBaseAaveApyBps(),
        fetchBtcPriceUSD(),
    ]);

    return {
        btcPriceUSD: btcPrice,
        btcVolatilityPct: btcVol,
        stacksUsdcApyBps: stacksApy,
        baseAaveApyBps: baseApy,
        timestamp: Date.now(),
    };
}
