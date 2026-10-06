// Sample data for the prototype: one wallet, fixed prices, and three sample accounts (scenarios).
//
// The scenario is read from localStorage `vnScenario` ("trader" | "new" | "empty", default "trader"); the control
// panel sets it and reloads the app. A few actions are remembered in localStorage so the app reacts to them:
//   vnMarginOpened  "1" after the first transaction of a user without a margin account (it opens one)
//   vnFaucet        JSON { symbol: raw units } granted by the test faucet, added to the wallet holdings
//
// Consumers: lib/*.js (wrappers replacing on-chain reads), fetch-interceptor.js (backend API), wallet-stand-in.js.

import { PublicKey } from "@solana/web3.js";

import { assets } from "@/lib/solana/assets";
import { liteStrategyAddress, marginAddress, reserveAddress } from "@/lib/solana/program-accounts";
import { usdToUnits } from "@/lib/solana/usd";

import { ev, transaction } from "./events";

export const WALLET = "ELSYxwMnsp1JgtTtzp43ATtiyUtxi2NLZTKWSVEbb93m";

const walletKey = new PublicKey(WALLET);
const MARGIN = marginAddress(walletKey).toBase58();
const ASSET = Object.fromEntries(assets.map((asset) => [asset.symbol, asset]));
const mint = (symbol) => ASSET[symbol].mint;
const reserve = (symbol) => reserveAddress(new PublicKey(ASSET[symbol].mint)).toBase58();
const strategy = (symbol) => liteStrategyAddress(new PublicKey(ASSET[symbol].mint)).toBase58();

/** Decimal string -> raw token units (bigint) for the asset's decimals, e.g. units("1.5", "SOL"). */
export function units(amount, symbol) {
  const decimals = ASSET[symbol].decimals;
  const [whole, fraction = ""] = String(amount).split(".");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt((fraction + "0".repeat(decimals)).slice(0, decimals) || "0");
}

/** USD prices used everywhere (oracle prices, swap quotes). */
export const PRICES = {
  SOL: 182.4,
  USDC: 1,
  TSLAx: 371.4,
  GOOGLx: 339.93,
  AAPLx: 332.37,
  ANTHROPIC: 1042.77,
  OPENAI: 2117.09,
};

const read = (key, fallback) => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {}
};

export const scenario = () => read("vnScenario", "trader");
const marginOpened = () => read("vnMarginOpened", "0") === "1";

/** Called after every successful transaction: a user without a margin account now has one (the app opens it). */
export function openMarginAccount() {
  if (scenario() !== "trader") write("vnMarginOpened", "1");
}

const faucetGrants = () => JSON.parse(read("vnFaucet", "{}"));

export function addFaucet(symbol, raw) {
  const grants = faucetGrants();
  grants[symbol] = (BigInt(grants[symbol] || "0") + raw).toString();
  write("vnFaucet", JSON.stringify(grants));
}

// Timestamps are relative to when the app loaded: ago(days, hours) in ms.
const LOADED_AT = Date.now();
const ago = (days, hours = 0) => LOADED_AT - 86400000 * days - 3600000 * hours;

// Deterministic fake base58 transaction signatures.
let signatureCounter = 0;
const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function fakeSignature(seed) {
  let value = 2654435761 * seed + 97;
  let signature = "";
  for (let i = 0; i < 88; i++) {
    value = (1103515245 * value + 12345) % 2147483648;
    signature += BASE58[value % 58];
  }
  return signature;
}

// Wallet balances per scenario (decimal strings).
const WALLET_BALANCES = {
  trader: { SOL: "24.5", USDC: "3120.40", TSLAx: "1.25", GOOGLx: "2", AAPLx: "0.75", ANTHROPIC: "0.96", OPENAI: "0.35" },
  new: { SOL: "2.5", USDC: "1500", TSLAx: "3", AAPLx: "1" },
  empty: {},
};

/** Wallet token holdings (replaces fetchHoldings). Faucet grants are added on top. */
export function holdings() {
  const balances = WALLET_BALANCES[scenario()] || WALLET_BALANCES.trader;
  const grants = faucetGrants();
  return assets
    .map((asset) => ({
      symbol: asset.symbol,
      raw: (balances[asset.symbol] ? units(balances[asset.symbol], asset.symbol) : 0n) + BigInt(grants[asset.symbol] || "0"),
      decimals: asset.decimals,
    }))
    .filter((holding) => holding.raw > 0n);
}

/** Earn vault shares held by the wallet (replaces fetchShareBalances). */
export function shareBalances() {
  if (scenario() !== "trader") return [];
  return [
    { symbol: "USDC", shares: units("2499.81", "USDC"), decimals: ASSET.USDC.decimals },
    { symbol: "SOL", shares: units("1.5", "SOL"), decimals: ASSET.SOL.decimals },
  ];
}

/** Oracle prices in USD units (replaces fetchOraclePrices). */
export function oraclePrices() {
  return Object.fromEntries(Object.entries(PRICES).map(([symbol, price]) => [symbol, usdToUnits(price)]));
}

/** Backend /api/account/<address> answer. */
export function accountPayload() {
  if (scenario() === "trader") {
    return {
      hasMarginAccount: true,
      marginAccountAddress: MARGIN,
      totalCollateralValue: 5619.65,
      grossCollateralValue: 5619.65,
      netAvailableCollateral: 2114.22,
      avgHealthFactor: 1.6,
      totalBorrowedValue: 3505.43,
      collateralLeftBeforeLiquidation: 1763.68,
      borrowRate: 4.77,
      collateralBalances: { USDC: { amount: "2000" }, TSLAx: { amount: "4.2422" }, GOOGLx: { amount: "1.5" } },
      borrowedBalances: { USDC: { amount: "2534.30" }, OPENAI: { amount: "0.458716" } },
    };
  }
  if (marginOpened()) {
    return {
      hasMarginAccount: true,
      marginAccountAddress: MARGIN,
      totalCollateralValue: 0,
      grossCollateralValue: 0,
      netAvailableCollateral: 0,
      avgHealthFactor: 999,
      totalBorrowedValue: 0,
      collateralLeftBeforeLiquidation: 0,
      borrowRate: 4.77,
      collateralBalances: {},
      borrowedBalances: {},
    };
  }
  return { hasMarginAccount: false };
}

/** Kamino (farm) positions of the margin account (replaces fetchKaminoPositions). */
export function kaminoPositions() {
  if (scenario() !== "trader") return [];
  return [{ pool: "USDC", supplied: units("1534.20", "USDC"), debt: units("1531.10", "USDC"), borrowRateBps: 465 }];
}

// Farm history: a GOOGLx deploy that landed but failed (the price moved past the slippage limit), retried two hours later
// by the GOOGLx deploy above. A failed transaction keeps the events it logged before the error and ends with it.
function failedFarmTransactions() {
  const failed = transaction(fakeSignature(501), Math.floor(ago(1, 5) / 1000), [
    ev.deposited(MARGIN, mint("GOOGLx"), units("1.5", "GOOGLx")),
    ev.borrowed(MARGIN, reserve("USDC"), units("1529.70", "USDC")),
    ev.liteOpened(MARGIN, strategy("USDC"), units("509.90", "USDC")),
    "Program log: AnchorError occurred. Error Code: SlippageToleranceExceeded. Error Number: 6001. Error Message: Slippage tolerance exceeded.",
  ]);
  const logs = failed.tx.meta.logMessages;
  const program = logs[0].split(" ")[1];
  logs[logs.length - 1] = `Program ${program} failed: custom program error: 0x1771`;
  failed.tx.meta.err = { InstructionError: [0, { Custom: 6001 }] };
  return [failed];
}

/** Wallet transaction history carrying Vanna events (replaces fetchWalletTransactions). */
export function walletTransactions() {
  if (scenario() !== "trader") return [];
  const tx = (days, hours, logs) =>
    transaction(fakeSignature(++signatureCounter + 10 * days), Math.floor(ago(days, hours) / 1000), logs);
  signatureCounter = 0;
  return [
    tx(1, 3, [
      ev.deposited(MARGIN, mint("GOOGLx"), units("1.5", "GOOGLx")),
      ev.borrowed(MARGIN, reserve("USDC"), units("1529.70", "USDC")),
      ev.liteOpened(MARGIN, strategy("USDC"), units("509.90", "USDC")),
    ]),
    tx(2, 5, [
      ev.deposited(MARGIN, mint("OPENAI"), units("0.458716", "OPENAI")),
      ev.borrowed(MARGIN, reserve("OPENAI"), units("0.458716", "OPENAI")),
      ev.swapped(MARGIN, mint("OPENAI"), mint("USDC"), units("0.917432", "OPENAI"), units("2000", "USDC")),
    ]),
    tx(3, 2, [
      ev.deposited(MARGIN, mint("USDC"), units("500", "USDC")),
      ev.borrowed(MARGIN, reserve("USDC"), units("1000", "USDC")),
      ev.swapped(MARGIN, mint("USDC"), mint("TSLAx"), units("1500", "USDC"), units("4.2422", "TSLAx")),
    ]),
    tx(6, 4, [
      ev.swapped(MARGIN, mint("AAPLx"), mint("USDC"), units("2.1", "AAPLx"), units("726.30", "USDC")),
      ev.repaid(MARGIN, reserve("USDC"), units("466", "USDC")),
      ev.withdrawn(MARGIN, mint("USDC"), units("260.30", "USDC")),
    ]),
    tx(9, 1, [
      ev.deposited(MARGIN, mint("USDC"), units("233", "USDC")),
      ev.borrowed(MARGIN, reserve("USDC"), units("466", "USDC")),
      ev.swapped(MARGIN, mint("USDC"), mint("AAPLx"), units("699", "USDC"), units("2.1", "AAPLx")),
    ]),
    tx(12, 6, [
      ev.liteClosed(MARGIN, strategy("SOL"), units("2.85", "SOL"), units("0.04", "SOL")),
      ev.repaid(MARGIN, reserve("SOL"), units("2.85", "SOL")),
      ev.withdrawn(MARGIN, mint("AAPLx"), units("1", "AAPLx")),
    ]),
    tx(14, 3, [
      ev.deposited(MARGIN, mint("AAPLx"), units("1", "AAPLx")),
      ev.borrowed(MARGIN, reserve("SOL"), units("2.85", "SOL")),
      ev.liteOpened(MARGIN, strategy("SOL"), units("1.8", "SOL")),
    ]),
    ...failedFarmTransactions(),
  ];
}

// Lending pools: [supplyAPY, borrowAPY, totalSupply, totalBorrowed, utilizationRate, exchangeRate].
const POOLS = {
  USDC: ["2.84", "3.42", "59012.40", "44610.25", "75.59", "1.000412"],
  SOL: ["1.62", "2.10", "299.30", "142.55", "47.63", "1.000213"],
  TSLAx: ["1.82", "6.10", "104.60", "40.12", "38.36", "1.000081"],
  GOOGLx: ["0.13", "2.40", "209.50", "21.10", "10.07", "1.000012"],
  AAPLx: ["0.36", "3.15", "185.20", "29.40", "15.87", "1.000020"],
  ANTHROPIC: ["0.40", "3.30", "122.10", "18.90", "15.48", "1.000019"],
  OPENAI: ["0.59", "3.90", "120.40", "21.70", "18.02", "1.000027"],
};

function earnHistory() {
  if (scenario() !== "trader") return [];
  return [
    { type: "withdraw", asset: "USDC", amount: "50", hash: fakeSignature(301), timestamp: ago(4, 2), status: "success" },
    { type: "supply", asset: "SOL", amount: "1.5", hash: fakeSignature(302), timestamp: ago(8, 5), status: "success" },
    { type: "supply", asset: "USDC", amount: "2550", hash: fakeSignature(303), timestamp: ago(10, 1), status: "success" },
  ];
}

function spotSwapHistory() {
  if (scenario() !== "trader") return [];
  return [
    { assetIn: "USDC", assetOut: "SOL", amountIn: "250", amountOut: "1.3681", hash: fakeSignature(401), timestamp: ago(2, 1) },
    { assetIn: "USDC", assetOut: "TSLAx", amountIn: "400", amountOut: "1.1312", hash: fakeSignature(402), timestamp: ago(5, 3) },
    { assetIn: "SOL", assetOut: "USDC", amountIn: "0.5", amountOut: "91.12", hash: fakeSignature(403), timestamp: ago(7, 6) },
  ];
}

/** Jupiter quote at the sample prices, minus 0.25%. */
function jupiterQuote(params) {
  const input = assets.find((asset) => asset.mint === params.get("inputMint"));
  const output = assets.find((asset) => asset.mint === params.get("outputMint"));
  const amount = BigInt(params.get("amount") || "0");
  const slippageBps = Number(params.get("slippageBps") || "50");
  if (!input || !output || amount === 0n) return null;
  const outAmount =
    (amount * BigInt(Math.round((PRICES[input.symbol] / PRICES[output.symbol]) * 0.9975 * 1e6)) * 10n ** BigInt(output.decimals)) /
    (1000000n * 10n ** BigInt(input.decimals));
  const threshold = (outAmount * BigInt(10000 - slippageBps)) / 10000n;
  const usdValue = (Number(amount) / 10 ** input.decimals) * PRICES[input.symbol];
  return {
    inAmount: amount.toString(),
    outAmount: outAmount.toString(),
    otherAmountThreshold: threshold.toString(),
    priceImpactPct: String(Math.min(0.03, usdValue / 4e6)),
    routePlan: [],
    slippageBps,
  };
}

/**
 * Answers a backend request (see fetch-interceptor.js). Returns the JSON body, or null when the prototype has no
 * sample data for it (the interceptor then answers 503). `method` and `body` (parsed JSON) are passed for logging
 * and future use; Solana JSON-RPC calls are not answered (the reads that matter are replaced in lib/*.js).
 */
export function api(url, _method, _body) {
  const parsed = new URL(url);
  const path = parsed.pathname;
  if (path.startsWith("/api/account/")) return accountPayload();
  if (path === "/api/pools") {
    return Object.fromEntries(
      Object.entries(POOLS).map(([symbol, [supplyAPY, borrowAPY, totalSupply, totalBorrowed, utilizationRate, exchangeRate]]) => [
        symbol,
        { supplyAPY, borrowAPY, totalSupply, totalBorrowed, utilizationRate, exchangeRate },
      ]),
    );
  }
  if (path === "/api/solana/history") return { rows: earnHistory() };
  if (path === "/api/solana/spot-history") return { rows: spotSwapHistory() };
  if (path === "/api/jupiter/quote") return jupiterQuote(parsed.searchParams);
  if (path.startsWith("/api/faucet/fork/")) {
    const symbol = decodeURIComponent(path.split("/").pop());
    const added = units(symbol === "USDC" ? "1000" : "20", symbol);
    addFaucet(symbol, added);
    return { added: added.toString() };
  }
  return null;
}

/** Kamino reserve stats (replaces fetchKaminoStats). */
export function kaminoStats() {
  return {
    USDC: {
      available: units("1820000", "USDC"),
      totalSupplied: units("4200000", "USDC"),
      utilizationBps: 5667,
      borrowApyBps: 790,
      supplyApyBps: 628,
    },
    SOL: {
      available: units("30000", "SOL"),
      totalSupplied: units("85000", "SOL"),
      utilizationBps: 6470,
      borrowApyBps: 610,
      supplyApyBps: 412,
    },
  };
}

// Risk limits per asset: [ltvBps, liquidationThresholdBps, liquidationBonusBps]; others get 7500 / 8000 / 500.
const LIMITS = { USDC: [9000, 9300, 500], SOL: [8000, 8500, 500] };

/** Vault reserve / limits / share supply per asset, consistent with POOLS (replaces fetchVaultAccounts). */
export function vaultAccounts() {
  return Object.fromEntries(
    Object.entries(POOLS).map(([symbol, [, , totalSupply, totalBorrowed, , exchangeRate]]) => {
      const supplied = units(totalSupply, symbol);
      const borrowed = units(totalBorrowed, symbol);
      const cap = symbol === "USDC" ? units("1000000", "USDC") : symbol === "SOL" ? units("5000", "SOL") : units("2500", symbol);
      const [ltvBps, liquidationThresholdBps, liquidationBonusBps] = LIMITS[symbol] || [7500, 8000, 500];
      return [
        symbol,
        {
          reserve: {
            supplyCap: cap,
            borrowCap: cap / 2n,
            accountedLiquidity: supplied - borrowed,
            totalBorrowAssets: borrowed,
            accruedFees: supplied / 10000n,
            baseRateBps: 0,
            slope1Bps: 400,
            slope2Bps: 30000,
            optimalBps: 8000,
            reserveFactorBps: 1000,
          },
          limits: {
            maxCollateralPerMargin: cap,
            ltvBps,
            liquidationThresholdBps,
            liquidationBonusBps,
            maxConfidenceBps: 200,
            maxPriceAgeSeconds: 60,
            collateralEnabled: true,
            borrowEnabled: true,
          },
          shareSupply: (1000000n * supplied) / BigInt(Math.round(1e6 * Number(exchangeRate))),
        },
      ];
    }),
  );
}
