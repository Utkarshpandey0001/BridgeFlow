// ===========================================================================
// Bitflow Vault — Clarinet Unit Tests (Vitest/Deno compatible)
// ===========================================================================
// Run with: clarinet test
// ===========================================================================

import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.7.0/index.ts';
import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.170.0/testing/asserts.ts';

// ===========================================================================
// USDC Token Tests
// ===========================================================================
Clarinet.test({
  name: 'faucet: mints 10000 USDCx to caller',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;

    const block = chain.mineBlock([
      Tx.contractCall('usdc-token', 'faucet', [], wallet1.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    // Check balance
    const balResult = chain.callReadOnlyFn('usdc-token', 'get-balance', [
      types.principal(wallet1.address),
    ], wallet1.address);
    balResult.result.expectOk().expectUint(10_000_000_000); // 10,000 USDCx
  },
});

Clarinet.test({
  name: 'transfer: moves tokens between principals',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const wallet2 = accounts.get('wallet_2')!;

    const block = chain.mineBlock([
      // Mint first
      Tx.contractCall('usdc-token', 'faucet', [], wallet1.address),
      // Transfer 1000 USDCx to wallet2
      Tx.contractCall('usdc-token', 'transfer', [
        types.uint(1_000_000_000),
        types.principal(wallet1.address),
        types.principal(wallet2.address),
        types.none(),
      ], wallet1.address),
    ]);

    block.receipts[1].result.expectOk().expectBool(true);

    const bal1 = chain.callReadOnlyFn('usdc-token', 'get-balance', [
      types.principal(wallet1.address),
    ], wallet1.address);
    bal1.result.expectOk().expectUint(9_000_000_000);

    const bal2 = chain.callReadOnlyFn('usdc-token', 'get-balance', [
      types.principal(wallet2.address),
    ], wallet2.address);
    bal2.result.expectOk().expectUint(1_000_000_000);
  },
});

// ===========================================================================
// Vault Tests
// ===========================================================================
Clarinet.test({
  name: 'deposit: increases user vault balance',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const deployer = accounts.get('deployer')!;

    chain.mineBlock([
      Tx.contractCall('usdc-token', 'faucet', [], wallet1.address),
    ]);

    const block = chain.mineBlock([
      Tx.contractCall('vault', 'deposit', [
        types.principal(`${deployer.address}.usdc-token`),
        types.uint(5_000_000_000), // 5,000 USDCx
      ], wallet1.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(5_000_000_000);

    const vaultBal = chain.callReadOnlyFn('vault', 'get-user-balance', [
      types.principal(wallet1.address),
    ], wallet1.address);
    vaultBal.result.expectUint(5_000_000_000);
  },
});

Clarinet.test({
  name: 'withdraw: decreases user vault balance',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const deployer = accounts.get('deployer')!;

    chain.mineBlock([
      Tx.contractCall('usdc-token', 'faucet', [], wallet1.address),
      Tx.contractCall('vault', 'deposit', [
        types.principal(`${deployer.address}.usdc-token`),
        types.uint(5_000_000_000),
      ], wallet1.address),
    ]);

    const block = chain.mineBlock([
      Tx.contractCall('vault', 'withdraw', [
        types.principal(`${deployer.address}.usdc-token`),
        types.uint(2_000_000_000),
      ], wallet1.address),
    ]);

    block.receipts[0].result.expectOk().expectUint(3_000_000_000);
  },
});

Clarinet.test({
  name: 'withdraw: fails when overdrafting',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const deployer = accounts.get('deployer')!;

    chain.mineBlock([
      Tx.contractCall('usdc-token', 'faucet', [], wallet1.address),
      Tx.contractCall('vault', 'deposit', [
        types.principal(`${deployer.address}.usdc-token`),
        types.uint(1_000_000_000),
      ], wallet1.address),
    ]);

    const block = chain.mineBlock([
      Tx.contractCall('vault', 'withdraw', [
        types.principal(`${deployer.address}.usdc-token`),
        types.uint(9_999_000_000), // way more than deposited
      ], wallet1.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(203); // ERR-INSUFFICIENT-BAL
  },
});

Clarinet.test({
  name: 'set-user-rules: stores agent config correctly',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;

    const block = chain.mineBlock([
      Tx.contractCall('vault', 'set-user-rules', [
        types.uint(1),    // AGENT-BALANCED
        types.uint(800),  // min-apy-bps = 8%
        types.uint(3000), // bridge-pct = 30%
        types.uint(4000), // vol-threshold = 40%
        types.bool(true), // auto-execute
      ], wallet1.address),
    ]);

    block.receipts[0].result.expectOk().expectBool(true);

    const rules = chain.callReadOnlyFn('vault', 'get-user-rules', [
      types.principal(wallet1.address),
    ], wallet1.address);

    const tupleResult = rules.result.expectSome().expectTuple();
    assertEquals(tupleResult['agent-type'], types.uint(1));
    assertEquals(tupleResult['min-apy-bps'], types.uint(800));
    assertEquals(tupleResult['bridge-pct-bps'], types.uint(3000));
  },
});

Clarinet.test({
  name: 'set-user-rules: rejects invalid agent type',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;

    const block = chain.mineBlock([
      Tx.contractCall('vault', 'set-user-rules', [
        types.uint(99),   // invalid type
        types.uint(800),
        types.uint(3000),
        types.uint(4000),
        types.bool(false),
      ], wallet1.address),
    ]);

    block.receipts[0].result.expectErr().expectUint(204); // ERR-INVALID-AGENT-TYPE
  },
});

Clarinet.test({
  name: 'trigger-bridge: fails when caller not approved agent',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;
    const deployer = accounts.get('deployer')!;

    const block = chain.mineBlock([
      Tx.contractCall('vault', 'trigger-bridge', [
        types.principal(`${deployer.address}.usdc-token`),
        types.principal(wallet1.address),
        types.ascii('test'),
      ], wallet1.address), // wallet1 is NOT an approved agent
    ]);

    block.receipts[0].result.expectErr().expectUint(201); // ERR-NOT-AGENT
  },
});

Clarinet.test({
  name: 'get-preset-rules: returns correct Safe config',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;

    const result = chain.callReadOnlyFn('vault', 'get-preset-rules', [
      types.uint(0), // AGENT-SAFE
    ], deployer.address);

    const tuple = result.result.expectSome().expectTuple();
    assertEquals(tuple['agent-type'], types.uint(0));
    assertEquals(tuple['bridge-pct-bps'], types.uint(2000)); // 20%
  },
});

Clarinet.test({
  name: 'leaderboard: opt-in and opt-out',
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const wallet1 = accounts.get('wallet_1')!;

    chain.mineBlock([
      Tx.contractCall('vault', 'set-leaderboard-optin', [types.bool(true)], wallet1.address),
    ]);

    const optinResult = chain.callReadOnlyFn('vault', 'is-leaderboard-optin', [
      types.principal(wallet1.address),
    ], wallet1.address);
    assertEquals(optinResult.result, 'true');

    chain.mineBlock([
      Tx.contractCall('vault', 'set-leaderboard-optin', [types.bool(false)], wallet1.address),
    ]);

    const optoutResult = chain.callReadOnlyFn('vault', 'is-leaderboard-optin', [
      types.principal(wallet1.address),
    ], wallet1.address);
    assertEquals(optoutResult.result, 'false');
  },
});
