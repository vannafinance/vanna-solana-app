// End-to-end Farm test on the Vanna fork with a local keypair: runs the app's own src/ builders and senders, signs locally in
// place of the wallet and sends real transactions to the fork. Fork tokens only; the keypair is a throwaway kept in the temp
// folder. Run from the repo root: node scripts/farm-e2e.cjs fund | usdc | sol | split | perps | heavy | stuck
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");
const { Keypair, PublicKey } = require("@solana/web3.js");
const { loadTs } = require(path.resolve("scripts/load-ts.cjs"));

const RPC_URL = "https://rpc-devnet.solana.vanna.finance";
const API_BASE_URL = "https://devnet.solana.vanna.finance";
const config = {
  RPC_URL,
  API_BASE_URL,
  VANNA_PROGRAM_ID: "BZ812nUv4Qhr2p1JVgmoJGjYTGk1brAXckyhFSCNH3Zg",
  CHAIN: "solana:mainnet",
  FORK_CHEATCODES_ENABLED: true,
  FORK_FAUCET_ENABLED: true,
  NETWORK_LABEL: "fork",
  NETWORK_FEE_ESTIMATE: "~",
  DEV_WALLET_ADDRESS: undefined,
};
const stubs = { "./config": config, "@/lib/solana/config": config };
const cache = new Map();
const load = (file) => loadTs(file, stubs, cache);

const { rpcConnection: connection } = load("src/lib/solana/rpc.ts");
const { requestFaucetGrant } = load("src/lib/solana/fork-faucet.ts");
const { createMarginAccount } = load("src/lib/solana/margin-transactions.ts");
const { deployFarm, exitFarm, withdrawStock, yieldAssetOf, freshDeployProgress } = load("src/lib/solana/farm-transactions.ts");
const { fetchOraclePrices } = load("src/lib/solana/oracle-prices.ts");
const { fetchKaminoPositions } = load("src/lib/solana/farm-positions.ts");
const { fetchMarginState } = load("src/lib/solana/margin-state.ts");
const { marginAddress } = load("src/lib/solana/program-accounts.ts");
const { assets } = load("src/lib/solana/assets.ts");
const { toTransactionError } = load("src/lib/solana/transaction-errors.ts");

const KEY_FILE = path.join(os.tmpdir(), "vanna-farm-e2e-key.json");
const keypair = fs.existsSync(KEY_FILE) ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(KEY_FILE, "utf8")))) : Keypair.generate();
fs.writeFileSync(KEY_FILE, JSON.stringify(Array.from(keypair.secretKey)));
const owner = keypair.publicKey;
const asset = (symbol) => assets.find((candidate) => candidate.symbol === symbol);

// Stands in for the wallet: counts prompts (each sign/signAll call is one wallet session on the phone).
function hooksFor(log) {
  return {
    sign: async (tx) => {
      log.prompts.push(1);
      tx.sign([keypair]);
      return tx;
    },
    signAll: async (txs) => {
      log.prompts.push(txs.length);
      for (const tx of txs) tx.sign([keypair]);
      return txs;
    },
    onPrepared: () => {},
    onSigned: () => {},
    onSent: (signature) => log.signatures.push(signature),
  };
}

async function step(name, run) {
  const log = { prompts: [], signatures: [] };
  const started = Date.now();
  try {
    await run(hooksFor(log));
    console.log(`PASS  ${name}  wallet prompts=${log.prompts.length} (txs per prompt ${JSON.stringify(log.prompts)})  ${((Date.now() - started) / 1000).toFixed(1)}s`);
    return true;
  } catch (error) {
    const mapped = toTransactionError(error);
    console.log(`FAIL  ${name}  -> "${mapped.title}": ${mapped.message}`);
    console.log(`      raw: ${String(error && error.message ? error.message : error).slice(0, 1500)}`);
    if (mapped.detail) console.log(`      detail: ${String(mapped.detail).slice(0, 1500)}`);
    return false;
  }
}

const unit = (symbol, amount) => BigInt(Math.round(amount * 10 ** asset(symbol).decimals));

async function borrowFor(stock, stockAmount, pool, leverage) {
  const prices = await fetchOraclePrices(connection);
  const stockUsd = Number(prices[stock]) / 1e6;
  const poolUsd = Number(prices[pool]) / 1e6;
  const borrowUsd = stockAmount * stockUsd * (leverage - 1);
  return unit(pool, borrowUsd / poolUsd);
}

async function show(label) {
  const positions = await fetchKaminoPositions(connection, owner);
  const state = await fetchMarginState(connection, marginAddress(owner));
  const rows = positions.map((p) => `${p.pool}: supplied=${p.supplied} debt=${p.debt}`).join(" | ") || "no Kamino positions";
  const collateral = (state.collateral ?? []).map?.((c) => `${c.symbol ?? c.asset}=${c.amount ?? c.raw}`).join(",") ?? "";
  console.log(`      [${label}] ${rows} ${collateral ? "collateral " + collateral : ""}`);
}

async function deploy(stock, amount, pool, leverage) {
  const borrow = await borrowFor(stock, amount, pool, leverage);
  const progress = freshDeployProgress();
  return step(`deploy ${amount} ${stock} -> ${pool} ${leverage}x (borrow ${borrow})`, (hooks) =>
    deployFarm(connection, owner, { stock: asset(stock), pool: yieldAssetOf(pool), collateral: unit(stock, amount), borrow }, hooks, progress),
  );
}

const exit = (pool, bps, label) => step(`close ${label} of ${pool} position (exitBps ${bps})`, (hooks) => exitFarm(connection, owner, { pool: yieldAssetOf(pool), exitBps: bps }, hooks));
const returnStock = (stock, amount) => step(`return ${amount} ${stock} to wallet`, (hooks) => withdrawStock(connection, owner, asset(stock), unit(stock, amount), hooks));

async function main() {
  const only = process.argv[2] ?? "all";
  console.log(`owner ${owner.toBase58()}  scenario ${only}`);
  if (only === "all" || only === "fund") {
    for (const symbol of ["SOL", "TSLAx", "GOOGLx", "AAPLx"]) {
      try {
        const grant = await requestFaucetGrant(symbol, owner.toBase58());
        console.log(`fund  ${symbol} +${grant.added}`);
      } catch (error) {
        console.log(`fund  ${symbol} FAILED ${error.message}`);
      }
    }
    await step("create margin account", (hooks) => createMarginAccount(connection, owner, hooks));
  }
  if (only === "all" || only === "usdc") {
    await deploy("TSLAx", 5, "USDC", 2);
    await show("after deploy");
    await exit("USDC", 2500, "25%");
    await show("after 25%");
    await exit("USDC", 5000, "50%");
    await show("after 50%");
    await exit("USDC", 10000, "100%");
    await show("after 100%");
    await returnStock("TSLAx", 5);
    await show("after stock return");
  }
  if (only === "all" || only === "sol") {
    await deploy("GOOGLx", 3, "SOL", 2);
    await show("after deploy");
    await exit("SOL", 10000, "100%");
    await returnStock("GOOGLx", 3);
    await show("after close");
  }
  if (only === "all" || only === "split") {
    await deploy("TSLAx", 4, "USDC", 2);
    await deploy("AAPLx", 4, "USDC", 3);
    await show("two stocks in USDC");
  }
  if (only === "perps") {
    const { openPosition } = load("src/lib/solana/perps-transactions.ts");
    await requestFaucetGrant("USDC", owner.toBase58()).catch(() => {});
    for (const symbol of ["GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI", "TSLAx"]) {
      await step(`perps open long 2x ${symbol} with 40 USDC`, (hooks) => openPosition(connection, owner, { side: "long", stock: asset(symbol), collateral: unit("USDC", 40), leverage: 2 }, hooks));
    }
  }
  if (only === "stuck") {
    await returnStock("TSLAx", 4);
    await show("after retry");
  }
  if (only === "heavy") {
    // Two stocks share the USDC pool: TSLAx owns its borrow share; close it as the app would (exitBps = fraction x share).
    const positions = await fetchKaminoPositions(connection, owner);
    console.log(`      pools: ${positions.map((p) => p.pool).join(",")}`);
    await exit("USDC", Math.round(2500 * 0.3573), "25% of the TSLAx share");
    await deploy("GOOGLx", 3, "SOL", 2);
    await exit("SOL", 2500, "25%");
    await exit("USDC", 3573, "100% of the TSLAx share");
    await returnStock("TSLAx", 4);
    await exit("SOL", 10000, "100%");
    await returnStock("GOOGLx", 3);
    await exit("USDC", 10000, "100% of the AAPLx share");
    await returnStock("AAPLx", 4);
    await show("end");
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
