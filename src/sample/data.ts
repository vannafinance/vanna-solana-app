// Sample data from the V7 design (design/app.html, core.js: PX, TOK, POOLS_BY, DATA).
// Powers Guest mode and every screen until the chain adapters are wired. Prototype clock: Oct 7.

import { REAL_BUILD } from "@/chain/build";
import type { Chain } from "@/state/chain";

export const PX: Record<string, number> = {
  SOL: 116.86, ETH: 2568.27, BTC: 83445.05, TSLA: 375.59, META: 725.8, JitoSOL: 141.2, JupSOL: 131.42, USDC: 1, USDT: 1, JupUSD: 1,
  NVDAx: 182.4, GOOGLx: 246.1, AAPLx: 256.3, TSLAx: 375.59, ANTHROPIC: 1042.77, OPENAI: 2117.09, SKR: 0.0412,
};

// lt = weight the health factor gives the token (sample values; the risk engine owns the real ones).
export const TOK: Record<string, { name: string; lt: number; stable?: boolean; dec?: number }> = {
  SOL: { name: "Solana", lt: 0.8, dec: 4 }, ETH: { name: "Ethereum", lt: 0.8, dec: 4 }, BTC: { name: "Bitcoin", lt: 0.8, dec: 4 },
  JitoSOL: { name: "Jito Staked SOL", lt: 0.75, dec: 4 }, JupSOL: { name: "Jupiter Staked SOL", lt: 0.75, dec: 4 },
  TSLA: { name: "Tesla", lt: 0.6, dec: 4 }, META: { name: "Meta", lt: 0.6, dec: 4 }, SKR: { name: "Seeker", lt: 0.55, dec: 2 },
  USDC: { name: "USD Coin", lt: 0.95, stable: true, dec: 2 }, USDT: { name: "Tether USD", lt: 0.95, stable: true, dec: 2 }, JupUSD: { name: "Jupiter USD", lt: 0.95, stable: true, dec: 2 },
  NVDAx: { name: "NVIDIA xStock", lt: 0.6, dec: 4 }, GOOGLx: { name: "Alphabet xStock", lt: 0.6, dec: 4 },
  AAPLx: { name: "Apple xStock", lt: 0.6, dec: 4 }, TSLAx: { name: "Tesla xStock", lt: 0.6, dec: 4 },
};

// Read from the chain (chain/solana/pools.ts): `live` is set once a read succeeded, so screens show "—" before that instead of numbers.
// rate = underlying per share (lender total / share-mint supply), rf = reserve factor (%), caps in tokens (null = no cap),
// curve = the reserve's rate-curve coefficients (fractions), status = the reserve's status label.
export type Pool = {
  sym: string; sup: number; supA: number; bor: number; borA: number; util: number; vSupply?: number; rate?: number;
  live?: boolean; rf?: number; supCap?: number | null; borCap?: number | null; status?: string; curve?: { l: number; j: number; m: number };
};

// Placeholders until the first live read (chain/live.ts) replaces them; never shown as numbers (live is unset).
export const POOLS_BY: Record<Chain, Pool[]> = {
  solana: ["SOL", "USDC", "USDT", "SKR"].map((sym) => ({ sym, sup: 0, supA: 0, bor: 0, borA: 0, util: 0 })),
};

export type Side = "long" | "short";
export type SpotPos = { id: string; sym: string; side: Side; qty: number; entry: number; t: string };
// qty: the size in tokens when read from the chain (Phoenix base lots); without it the size is coll x lev / entry.
// lev: the position's effective leverage on Phoenix's shared (cross-margin) collateral; pool: all USDC collateral in Phoenix.
export type PerpPos = { id: string; k: string; side: Side; lev: number; coll: number; entry: number; t: string; qty?: number; pool?: number };
// earnedUnknown: read from the chain but the history cannot prove the cost basis, so earnings show "—" (earned stays 0, amt is
// the full value). receiptsRaw: the receipt tokens held (raw), to check the history against.
export type FarmPos = { id: string; venue: string; name: string; sym: string; icon: string; amt: number; apy: number; earned: number; since: string; earnedUnknown?: boolean; receiptsRaw?: string };
// shares: the vToken balance when read from the chain (a 100% withdraw redeems exactly this); sharesRaw: the same, raw.
export type LendPos = { sym: string; amt: number; earned: number; since: string; shares?: number; sharesRaw?: string; earnedUnknown?: boolean };

export type ChainData = {
  wallet: Record<string, number>;
  margin: {
    coll: { sym: string; amt: number }[];
    debt: { sym: string; amt: number }[];
    avail: Record<string, number>;
    interestPaid: number;
    // a real account whose history cannot prove the interest: shown as "—"
    interestUnknown?: boolean;
    created: string | null;
    /** Net deposits (deposits - withdrawals) in USD at each transaction's own time; null = some cost basis is unknown ("—"). */
    netDeposits?: number | null;
    /** Account P&L points [ms, USD] for the chart: the account opened at 0, one after each event, then now. */
    pnlSnaps?: [number, number][];
    /**
     * phUSD in the margin account (USDC converted for Phoenix: between a perps open's two transactions, or left by an open whose
     * order did not land). Collateral for the program's health check like USDC (same price, same weights); not withdrawable as is.
     */
    phUsd?: number;
  };
  spot: SpotPos[];
  perps: PerpPos[];
  phoenixIdle: number;
  farm: FarmPos[];
  lend: LendPos[];
  realized: number;
  // a real account whose history cannot prove the realized profit: shown as "—"
  realizedUnknown?: boolean;
};

export const DATA: Record<Chain, ChainData> = {
  solana: {
    wallet: { SOL: 3.2, USDC: 850, USDT: 120 },
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
      { id: "kamino-usdc", venue: "Kamino", name: "USDC Lending", sym: "USDC", icon: "USDC", amt: 1000, apy: 4.43, earned: 2.18, since: "Sep 19" },
    ],
    lend: [
      { sym: "USDC", amt: 2000, earned: 14.2, since: "Aug 20" },
      { sym: "SOL", amt: 4, earned: 0.006, since: "Sep 20" },
    ],
    realized: 0,
  },
};

// The Vanna account (design ACCOUNTS.email).
export const ACCOUNT = {
  method: "email" as "email" | "wallet" | "guest",
  name: "Maya",
  email: "maya@example.com",
  verified: true,
  wallets: {
    solana: { addr: "7xKX…9fQ2", kind: "embedded", app: "Vanna wallet" },
  } as Record<Chain, { addr: string; kind: "embedded" | "external"; app: string }>,
};

// Rewards total shown as the header chip (Rewards itself is parked).
export const POINTS = REAL_BUILD ? 0 : 10121; // rewards are not connected yet, so a real account starts at zero

export type Activity = { t: string; area: string; action: string; detail: string; amt: string; usd?: number; via?: string; tx: string; sym?: string; hash?: string; chain?: "solana"; ms?: number };

export const ACTIVITY: Record<Chain, Activity[]> = {
  solana: [
    { t: "Oct 7, 09:12", area: "Earn", action: "Supply", detail: "USDC pool", amt: "+500.00 USDC", usd: 500, tx: "4hQm…e2Lk", sym: "USDC" },
    { t: "Oct 6, 16:05", area: "Spot", action: "Short", detail: "Sold 0.25 ETH (borrowed)", amt: "−0.25 ETH, +660.00 USDC", usd: 660, via: "Titan", tx: "3Wq8…vNb2", sym: "ETH" },
    { t: "Oct 6, 16:05", area: "Margin", action: "Borrow", detail: "ETH for the spot short", amt: "0.25 ETH", usd: 660, tx: "3Wq8…vNb2", sym: "ETH" },
    { t: "Oct 6, 11:20", area: "Spot", action: "Long", detail: "Bought 10 SOL", amt: "−1,132.00 USDC, +10.00 SOL", usd: 1132, via: "Jupiter", tx: "5KfR…m7Tq", sym: "SOL" },
    { t: "Oct 6, 09:41", area: "Perps", action: "Short", detail: "BTC-PERP 2x on Phoenix", amt: "1,500.00 USDC", usd: 1500, tx: "2bNe…Qa9P", sym: "BTC" },
    { t: "Oct 5, 14:02", area: "Perps", action: "Long", detail: "SOL-PERP 5x on Phoenix", amt: "1,200.00 USDC", usd: 1200, tx: "9sLd…Kc4W", sym: "SOL" },
    { t: "Oct 1, 03:12", area: "Margin", action: "Liquidated", detail: "ETH long 3x: collateral sold to repay the debt", amt: "−1,214.30 USDC", usd: -1214.3, tx: "6Lqz…Rw4K", sym: "ETH" },
    { t: "Sep 20, 19:05", area: "Earn", action: "Supply", detail: "SOL pool", amt: "+4.00 SOL", usd: 467.44, tx: "6Gvx…Ra3M", sym: "SOL" },
    { t: "Sep 19, 17:40", area: "Farm", action: "Supply", detail: "Kamino USDC Lending", amt: "1,000.00 USDC", usd: 1000, tx: "8Jkw…Ty5D", sym: "USDC" },
    { t: "Sep 17, 10:05", area: "Margin", action: "Borrow", detail: "USDC", amt: "6,000.00 USDC", usd: 6000, tx: "Fe2p…Lm8S", sym: "USDC" },
    { t: "Sep 17, 10:02", area: "Margin", action: "Deposit", detail: "USDC collateral", amt: "1,500.00 USDC", usd: 1500, tx: "Ab7c…Ux3V", sym: "USDC" },
    { t: "Sep 17, 10:01", area: "Margin", action: "Deposit", detail: "SOL collateral", amt: "38.50 SOL", usd: 4499.11, tx: "Ch4n…Wp6Z", sym: "SOL" },
    { t: "Sep 17, 10:00", area: "Margin", action: "Account created", detail: "Margin account", amt: "", tx: "Dq1v…Ks2N", sym: "USDC" },
    { t: "Aug 20, 08:30", area: "Earn", action: "Supply", detail: "USDC pool", amt: "+1,500.00 USDC", usd: 1500, tx: "Ej9t…Bo4R", sym: "USDC" },
  ],
};

export type Note = {
  id: string;
  chain: Chain | "account";
  cat: "health" | "trades" | "earn" | "rewards";
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
  { id: "n5", chain: "account", cat: "rewards", icon: "vanna", badge: "earned", title: "Weekly points drop", msg: "Your points for last week landed.", time: "2d", unread: true },
  { id: "n6", chain: "solana", cat: "trades", icon: "SOL", badge: "opened", title: "SOL long opened", msg: "10 SOL at $113.20 with borrowed USDC.", time: "Oct 6", unread: true },
  { id: "n7", chain: "solana", cat: "trades", icon: "BTC", badge: "opened", title: "BTC-PERP short opened", msg: "2x short on Phoenix with 1,500 USDC.", time: "Oct 6", unread: false },
  { id: "n9", chain: "account", cat: "rewards", icon: "vanna", badge: "safe", title: "You're approved", msg: "Your testnet access is ready. You have 3 invite codes to share.", time: "Oct 2", unread: false },
  { id: "n8", chain: "solana", cat: "earn", icon: "SOL", badge: "earned", title: "SOL supplied", msg: "4 SOL is earning 3.10% APY.", time: "Sep 20", unread: false },
];

// Phoenix account history (design DATA.perpHist).
export type PerpHist = { t: string; a: "Open / increase" | "Close / reduce" | "Deposit to Phoenix" | "Account setup"; k: string; side: Side | ""; size: number | null; usdc: number | null; lev?: number; pnl?: number; entry?: number; qty?: number; effLev?: number; pool?: number; ms?: number; hash?: string; fromChain?: boolean; cms?: number };
export const PERP_HIST: PerpHist[] = [
  { t: "Oct 6, 09:41", a: "Open / increase", k: "BTC", side: "short", size: 3000, usdc: 1500, lev: 2 },
  { t: "Oct 5, 14:02", a: "Open / increase", k: "SOL", side: "long", size: 6000, usdc: 1200, lev: 5 },
  { t: "Oct 5, 14:01", a: "Deposit to Phoenix", k: "", side: "", size: null, usdc: 2820 },
  { t: "Oct 5, 14:00", a: "Account setup", k: "", side: "", size: null, usdc: null },
  { t: "Oct 4, 18:20", a: "Close / reduce", k: "ETH", side: "long", size: 1500, usdc: 538.2, lev: 3, pnl: 59.37 },
];
