// ===========================================================================
// Executor — Submits bridge trigger tx to Stacks vault via stacks.js
// ===========================================================================
import * as dotenv from 'dotenv';
dotenv.config();

// Typed stacks.js imports — real transaction submission
// (In demo mode these are simulated but the code structure is production-ready)
let makeContractCall: any;
let broadcastTransaction: any;
let standardPrincipalCV: any;
let stringAsciiCV: any;
let contractPrincipalCV: any;
let noneCV: any;
let StacksTestnet: any;
let StacksMainnet: any;

try {
    const txModule = require('@stacks/transactions');
    makeContractCall = txModule.makeContractCall;
    broadcastTransaction = txModule.broadcastTransaction;
    standardPrincipalCV = txModule.standardPrincipalCV;
    stringAsciiCV = txModule.stringAsciiCV;
    contractPrincipalCV = txModule.contractPrincipalCV;
    noneCV = txModule.noneCV;
    const netModule = require('@stacks/network');
    StacksTestnet = netModule.StacksTestnet;
    StacksMainnet = netModule.StacksMainnet;
} catch {
    console.warn('[executor] @stacks/transactions not installed — running in simulation mode');
}

export interface BridgeResult {
    success: boolean;
    txId?: string;
    simulated: boolean;
    error?: string;
    amount?: number;
}

function getNetwork() {
    const net = process.env.STACKS_NETWORK || 'testnet';
    if (StacksMainnet && net === 'mainnet') return new StacksMainnet();
    if (StacksTestnet) return new StacksTestnet();
    return null; // simulation mode
}

export async function executeBridge(
    userAddress: string,
    reason: string,
): Promise<BridgeResult> {
    const vaultContract = process.env.VAULT_CONTRACT_ADDRESS!;
    const vaultName = process.env.VAULT_CONTRACT_NAME || 'vault';
    const usdcContract = process.env.USDC_CONTRACT_ADDRESS!;
    const usdcName = process.env.USDC_CONTRACT_NAME || 'usdc-token';
    const agentKey = process.env.AGENT_PRIVATE_KEY;
    const network = getNetwork();

    // If @stacks/transactions not available or no key, simulate
    if (!makeContractCall || !agentKey || !network) {
        const simulatedTxId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        console.log(`[executor][SIM] Bridge triggered for ${userAddress}: ${reason} | txId: ${simulatedTxId}`);
        return { success: true, txId: simulatedTxId, simulated: true };
    }

    try {
        const tx = await makeContractCall({
            contractAddress: vaultContract,
            contractName: vaultName,
            functionName: 'trigger-bridge',
            functionArgs: [
                contractPrincipalCV(usdcContract, usdcName),
                standardPrincipalCV(userAddress),
                stringAsciiCV(reason.slice(0, 64)),
            ],
            senderKey: agentKey,
            network,
            postConditionMode: 1, // allow
        });

        const result = await broadcastTransaction({ transaction: tx, network });

        if (result.error) {
            return { success: false, error: result.error, simulated: false };
        }

        console.log(`[executor] Bridge tx broadcast: ${result.txid}`);
        return { success: true, txId: result.txid, simulated: false };
    } catch (err: any) {
        console.error('[executor] Error broadcasting:', err.message);
        return { success: false, error: err.message, simulated: false };
    }
}
