// Sample data from the V7 design (design/app.html, core.js: PX, TOK, POOLS_BY, DATA, PREDICT_FALLBACK).
// Powers Guest mode and every screen until the chain adapters are wired. Prototype clock: Oct 7.

import type { Chain } from "@/state/chain";

export const PX: Record<string, number> = {
  SOL: 116.86, ETH: 2568.27, BTC: 83445.05, TSLA: 375.59, META: 725.8, JitoSOL: 141.2, JupSOL: 131.42, USDC: 1, USDT: 1, JupUSD: 1, CASH: 1,
  NVDAx: 182.4, GOOGLx: 246.1, AAPLx: 256.3, TSLAx: 375.59, ANTHROPIC: 1042.77, OPENAI: 2117.09, SKR: 0.0412,
  XLM: 0.1915, BLUSDC: 1, AqUSDC: 1, SoUSDC: 1,
};

// lt = weight the health factor gives the token (sample values; the risk engine owns the real ones).
export const TOK: Record<string, { name: string; lt: number; stable?: boolean; dec?: number }> = {
  SOL: { name: "Solana", lt: 0.8, dec: 4 }, ETH: { name: "Ethereum", lt: 0.8, dec: 4 }, BTC: { name: "Bitcoin", lt: 0.8, dec: 4 },
  JitoSOL: { name: "Jito Staked SOL", lt: 0.75, dec: 4 }, JupSOL: { name: "Jupiter Staked SOL", lt: 0.75, dec: 4 },
  TSLA: { name: "Tesla", lt: 0.6, dec: 4 }, META: { name: "Meta", lt: 0.6, dec: 4 }, SKR: { name: "Seeker", lt: 0.5, dec: 4 },
  USDC: { name: "USD Coin", lt: 0.95, stable: true, dec: 2 }, USDT: { name: "Tether USD", lt: 0.95, stable: true, dec: 2 }, JupUSD: { name: "Jupiter USD", lt: 0.95, stable: true, dec: 2 },
  NVDAx: { name: "NVIDIA xStock", lt: 0.6, dec: 4 }, GOOGLx: { name: "Alphabet xStock", lt: 0.6, dec: 4 },
  AAPLx: { name: "Apple xStock", lt: 0.6, dec: 4 }, TSLAx: { name: "Tesla xStock", lt: 0.6, dec: 4 },
  CASH: { name: "CASH", lt: 0, stable: true, dec: 2 },
  XLM: { name: "Stellar Lumens", lt: 0.75, dec: 4 },
  BLUSDC: { name: "Blend USDC", lt: 0.95, stable: true, dec: 2 }, AqUSDC: { name: "Aquarius USDC", lt: 0.95, stable: true, dec: 2 },
  SoUSDC: { name: "Soroswap USDC", lt: 0.95, stable: true, dec: 2 },
};

export type Pool = { sym: string; sup: number; supA: number; bor: number; borA: number; util: number; vSupply?: number; rate?: number };

export const POOLS_BY: Record<Chain, Pool[]> = {
  solana: [
    { sym: "SOL", sup: 6450, supA: 3.1, bor: 2100, borA: 5.6, util: 32.6 },
    { sym: "USDC", sup: 69750, supA: 5.4, bor: 52300, borA: 7.6, util: 75.0 },
    { sym: "USDT", sup: 26850, supA: 4.1, bor: 15200, borA: 6.3, util: 56.6 },
  ],
  stellar: [
    { sym: "XLM", sup: 80300, supA: 41.78, bor: 76290, borA: 43.98, util: 95.0 },
    { sym: "BLUSDC", sup: 15260, supA: 41.66, bor: 14490, borA: 43.86, util: 94.98 },
    { sym: "AqUSDC", sup: 10340, supA: 15.26, bor: 6830, borA: 23.11, util: 66.02 },
    { sym: "SoUSDC", sup: 146220, supA: 5.47, bor: 57810, borA: 13.84, util: 39.53 },
  ],
};

export type Side = "long" | "short";
export type SpotPos = { id: string; sym: string; side: Side; qty: number; entry: number; t: string };
export type PerpPos = { id: string; k: string; side: Side; lev: number; coll: number; entry: number; t: string };
export type FarmPos = { id: string; kind: "lend" | "dn" | "lp"; venue: string; name: string; sym: string; icon: string; amt: number; apy: number; earned: number; since: string };
// shares: the vToken balance when read from the chain (a 100% withdraw redeems exactly this)
export type LendPos = { sym: string; amt: number; earned: number; since: string; shares?: number };

export type ChainData = {
  wallet: Record<string, number>;
  margin: {
    coll: { sym: string; amt: number }[];
    debt: { sym: string; amt: number }[];
    avail: Record<string, number>;
    interestPaid: number;
    created: string | null;
  };
  spot: SpotPos[];
  perps: PerpPos[];
  phoenixIdle: number;
  farm: FarmPos[];
  lend: LendPos[];
  realized: number;
};

export const DATA: Record<Chain, ChainData> = {
  solana: {
    wallet: { SOL: 3.2, USDC: 850, USDT: 120, CASH: 240 },
    margin: {
      coll: [{ sym: "SOL", amt: 38.5 }, { sym: "USDC", amt: 1500 }],
      debt: [{ sym: "USDC", amt: 6000 }, { sym: "ETH", amt: 0.25 }],
      avail: { USDC: 300 },
      interestPaid: 25.1,
      created: "Sep 17, 10:02",
    },
    spot: [
      { id: "s1", sym: "SOL", side: "long", qty: 10, entry: 113.2, t: "Oct 6, 11:20" },
      { id: "s2", sym: "ETH", side: "short", qty: 0.25, entry: 2640.0, t: "Oct 6, 16:05" },
    ],
    perps: [
      { id: "p1", k: "SOL", side: "long", lev: 5, coll: 1200, entry: 114.2, t: "Oct 5, 14:02" },
      { id: "p2", k: "BTC", side: "short", lev: 2, coll: 1500, entry: 82840, t: "Oct 6, 09:41" },
    ],
    phoenixIdle: 120,
    farm: [
      { id: "kamino-usdc", kind: "lend", venue: "Kamino", name: "USDC Lending", sym: "USDC", icon: "USDC", amt: 1000, apy: 4.43, earned: 2.18, since: "Sep 19" },
      { id: "basis-sol", kind: "dn", venue: "Jupiter and Phoenix", name: "SOL Basis", sym: "USDC", icon: "SOL", amt: 700, apy: 10.63, earned: 2.85, since: "Sep 23" },
    ],
    lend: [
      { sym: "USDC", amt: 2000, earned: 14.2, since: "Aug 20" },
      { sym: "SOL", amt: 4, earned: 0.006, since: "Sep 20" },
    ],
    realized: 0,
  },
  stellar: {
    wallet: { XLM: 3200, USDC: 400, BLUSDC: 250, AqUSDC: 1000, SoUSDC: 150 },
    margin: {
      coll: [{ sym: "XLM", amt: 6000 }, { sym: "BLUSDC", amt: 300 }],
      debt: [{ sym: "SoUSDC", amt: 2400 }],
      avail: { SoUSDC: 378.2 },
      interestPaid: 4.76,
      created: "Sep 22, 14:10",
    },
    spot: [{ id: "st-s1", sym: "XLM", side: "long", qty: 11000, entry: 0.1838, t: "Oct 2, 09:30" }],
    perps: [],
    phoenixIdle: 0,
    farm: [{ id: "blend-usdc", kind: "lend", venue: "Blend", name: "USDC Supply", sym: "BLUSDC", icon: "BLUSDC", amt: 500, apy: 2.74, earned: 0.41, since: "Sep 26" }],
    lend: [{ sym: "BLUSDC", amt: 600, earned: 8.1, since: "Sep 23" }],
    realized: 0,
  },
};

export type PredictPos = { eventId: string; event: string; market: string; shares: number; avg: number; mark: number; earned: number; apy: number };

// Solana only (Predict is hidden on Stellar).
export const PREDICT: PredictPos[] = [
  { eventId: "nfl-ne-jax", event: "Patriots vs Jaguars", market: "Jaguars", shares: 300.92, avg: 0.41, mark: 0.42, earned: 0.39, apy: 3.73 },
  { eventId: "fed-oct", event: "Fed decision in October?", market: "25 bps cut", shares: 401.18, avg: 0.12, mark: 0.14, earned: 0.17, apy: 5.4 },
  { eventId: "iran-blockade", event: "US ends Iran blockade by Dec 31?", market: "Dec 31", shares: 250.73, avg: 0.44, mark: 0.48, earned: 0.35, apy: 4.24 },
  { eventId: "lal-bar-osa", event: "Barcelona vs Osasuna", market: "Barcelona", shares: 150.14, avg: 0.64, mark: 0.7, earned: 0.1, apy: 3.72 },
];

// One Vanna account across chains (design ACCOUNTS.email): email sign-in = an embedded wallet per chain.
export const ACCOUNT = {
  method: "email" as "email" | "wallet" | "guest",
  name: "Maya",
  email: "maya@example.com",
  verified: true,
  wallets: {
    solana: { addr: "7xKX…9fQ2", kind: "embedded", app: "Vanna wallet" },
    stellar: { addr: "GD3K…Q7MZ", kind: "embedded", app: "Vanna wallet" },
  } as Record<Chain, { addr: string; kind: "embedded" | "external"; app: string }>,
};

// Rewards total shown as the header chip (Rewards itself is parked).
export const POINTS = 10121;

export type Activity = { t: string; area: string; action: string; detail: string; amt: string; usd?: number; via?: string; tx: string; sym?: string };

export const ACTIVITY: Record<Chain, Activity[]> = {
  solana: [
    { t: "Oct 7, 09:12", area: "Earn", action: "Supply", detail: "USDC pool", amt: "+500.00 USDC", usd: 500, tx: "4hQm…e2Lk", sym: "USDC" },
    { t: "Oct 6, 16:05", area: "Spot", action: "Short", detail: "Sold 0.25 ETH (borrowed)", amt: "−0.25 ETH, +660.00 USDC", usd: 660, via: "Titan", tx: "3Wq8…vNb2", sym: "ETH" },
    { t: "Oct 6, 16:05", area: "Margin", action: "Borrow", detail: "ETH for the spot short", amt: "0.25 ETH", usd: 660, tx: "3Wq8…vNb2", sym: "ETH" },
    { t: "Oct 6, 11:20", area: "Spot", action: "Long", detail: "Bought 10 SOL", amt: "−1,132.00 USDC, +10.00 SOL", usd: 1132, via: "Jupiter", tx: "5KfR…m7Tq", sym: "SOL" },
    { t: "Oct 6, 09:41", area: "Perps", action: "Short", detail: "BTC-PERP 2x on Phoenix", amt: "1,500.00 USDC", usd: 1500, tx: "2bNe…Qa9P", sym: "BTC" },
    { t: "Oct 5, 14:02", area: "Perps", action: "Long", detail: "SOL-PERP 5x on Phoenix", amt: "1,200.00 USDC", usd: 1200, tx: "9sLd…Kc4W", sym: "SOL" },
    { t: "Oct 1, 03:12", area: "Margin", action: "Liquidated", detail: "ETH long 3x: collateral sold to repay the debt", amt: "−1,214.30 USDC", usd: -1214.3, tx: "6Lqz…Rw4K", sym: "ETH" },
    { t: "Sep 23, 12:30", area: "Farm", action: "Deposit", detail: "SOL Basis vault", amt: "700.00 USDC", usd: 700, tx: "7Pzr…Hn1C", sym: "USDC" },
    { t: "Sep 20, 19:05", area: "Earn", action: "Supply", detail: "SOL pool", amt: "+4.00 SOL", usd: 467.44, tx: "6Gvx…Ra3M", sym: "SOL" },
    { t: "Sep 19, 17:40", area: "Farm", action: "Supply", detail: "Kamino USDC Lending", amt: "1,000.00 USDC", usd: 1000, tx: "8Jkw…Ty5D", sym: "USDC" },
    { t: "Sep 17, 10:05", area: "Margin", action: "Borrow", detail: "USDC", amt: "6,000.00 USDC", usd: 6000, tx: "Fe2p…Lm8S", sym: "USDC" },
    { t: "Sep 17, 10:02", area: "Margin", action: "Deposit", detail: "USDC collateral", amt: "1,500.00 USDC", usd: 1500, tx: "Ab7c…Ux3V", sym: "USDC" },
    { t: "Sep 17, 10:01", area: "Margin", action: "Deposit", detail: "SOL collateral", amt: "38.50 SOL", usd: 4499.11, tx: "Ch4n…Wp6Z", sym: "SOL" },
    { t: "Sep 17, 10:00", area: "Margin", action: "Account created", detail: "Margin account", amt: "", tx: "Dq1v…Ks2N", sym: "USDC" },
    { t: "Aug 20, 08:30", area: "Earn", action: "Supply", detail: "USDC pool", amt: "+1,500.00 USDC", usd: 1500, tx: "Ej9t…Bo4R", sym: "USDC" },
  ],
  stellar: [
    { t: "Oct 6, 18:20", area: "Earn", action: "Supply", detail: "BLUSDC pool", amt: "+100.00 BLUSDC", usd: 100, tx: "9c1e…4a7b", sym: "BLUSDC" },
    { t: "Oct 2, 09:30", area: "Spot", action: "Long", detail: "Bought 11,000 XLM", amt: "−2,021.80 SoUSDC, +11,000.00 XLM", usd: 2021.8, via: "Soroswap", tx: "3f08…d21c", sym: "XLM" },
    { t: "Oct 2, 09:28", area: "Margin", action: "Borrow", detail: "SoUSDC, for the spot long", amt: "2,400.00 SoUSDC", usd: 2400, tx: "b7a2…0e91", sym: "SoUSDC" },
    { t: "Sep 26, 16:05", area: "Farm", action: "Supply", detail: "Blend BLUSDC Lending", amt: "500.00 BLUSDC", usd: 500, via: "Blend", tx: "e44d…7c30", sym: "BLUSDC" },
    { t: "Sep 23, 10:40", area: "Earn", action: "Supply", detail: "BLUSDC pool", amt: "+500.00 BLUSDC", usd: 500, tx: "5d9b…a1f4", sym: "BLUSDC" },
    { t: "Sep 22, 14:13", area: "Margin", action: "Deposit", detail: "BLUSDC collateral", amt: "800.00 BLUSDC", usd: 800, tx: "0a6f…c5e8", sym: "BLUSDC" },
    { t: "Sep 22, 14:12", area: "Margin", action: "Deposit", detail: "XLM collateral", amt: "6,000.00 XLM", usd: 1149, tx: "7e2c…19bd", sym: "XLM" },
    { t: "Sep 22, 14:10", area: "Margin", action: "Account created", detail: "Margin account", amt: "", tx: "c830…5f62", sym: "XLM" },
  ],
};

export type Note = {
  id: string;
  chain: Chain | "account";
  cat: "health" | "trades" | "earn" | "predict" | "rewards";
  icon: string;
  badge: "warning" | "gain" | "earned" | "opened" | "safe";
  title: string;
  msg: string;
  time: string;
  unread: boolean;
};

export const NOTES: Note[] = [
  { id: "n1", chain: "solana", cat: "health", icon: "vanna", badge: "warning", title: "Health factor 1.38", msg: "Below 1.50. Add collateral or repay to stay clear of liquidation at 1.10.", time: "5m", unread: true },
  { id: "n2", chain: "solana", cat: "trades", icon: "SOL", badge: "gain", title: "SOL-PERP long is up", msg: "Your 5x long on Phoenix is up $157.92.", time: "1h", unread: true },
  { id: "n3", chain: "solana", cat: "earn", icon: "USDC", badge: "earned", title: "Interest paid", msg: "Your USDC supply earned $0.30 today.", time: "3h", unread: true },
  { id: "n4", chain: "solana", cat: "predict", icon: "vanna", badge: "opened", title: "Barcelona vs Osasuna kicks off Saturday", msg: "Your Yes shares on Barcelona trade until kickoff.", time: "5h", unread: true },
  { id: "n5", chain: "account", cat: "rewards", icon: "vanna", badge: "earned", title: "Weekly points drop", msg: "Your points for last week landed.", time: "2d", unread: true },
  { id: "n6", chain: "solana", cat: "trades", icon: "SOL", badge: "opened", title: "SOL long opened", msg: "10 SOL at $113.20 with borrowed USDC.", time: "Oct 6", unread: true },
  { id: "n7", chain: "solana", cat: "trades", icon: "BTC", badge: "opened", title: "BTC-PERP short opened", msg: "2x short on Phoenix with 1,500 USDC.", time: "Oct 6", unread: false },
  { id: "n9", chain: "account", cat: "rewards", icon: "vanna", badge: "safe", title: "You're approved", msg: "Your testnet access is ready. You have 3 invite codes to share.", time: "Oct 2", unread: false },
  { id: "n8", chain: "solana", cat: "earn", icon: "SOL", badge: "earned", title: "SOL supplied", msg: "4 SOL is earning 3.10% APY.", time: "Sep 20", unread: false },
  { id: "s1", chain: "stellar", cat: "earn", icon: "BLUSDC", badge: "earned", title: "Interest paid", msg: "Your BLUSDC supply on Blend earned $0.69 today.", time: "4h", unread: true },
  { id: "s2", chain: "stellar", cat: "trades", icon: "XLM", badge: "opened", title: "XLM long opened", msg: "11,000 XLM at $0.1838 on Soroswap.", time: "Oct 2", unread: false },
  { id: "s3", chain: "stellar", cat: "earn", icon: "BLUSDC", badge: "earned", title: "BLUSDC supplied", msg: "600 BLUSDC is earning 41.66% APY on Blend.", time: "Sep 23", unread: false },
];

// Phoenix account history (design DATA.perpHist).
export type PerpHist = { t: string; a: "Open / increase" | "Close / reduce" | "Deposit to Phoenix" | "Account setup"; k: string; side: Side | ""; size: number | null; usdc: number | null; lev?: number; pnl?: number };
export const PERP_HIST: PerpHist[] = [
  { t: "Oct 6, 09:41", a: "Open / increase", k: "BTC", side: "short", size: 3000, usdc: 1500, lev: 2 },
  { t: "Oct 5, 14:02", a: "Open / increase", k: "SOL", side: "long", size: 6000, usdc: 1200, lev: 5 },
  { t: "Oct 5, 14:01", a: "Deposit to Phoenix", k: "", side: "", size: null, usdc: 2820 },
  { t: "Oct 5, 14:00", a: "Account setup", k: "", side: "", size: null, usdc: null },
  { t: "Oct 4, 18:20", a: "Close / reduce", k: "ETH", side: "long", size: 1500, usdc: 538.2, lev: 3, pnl: 59.37 },
];
