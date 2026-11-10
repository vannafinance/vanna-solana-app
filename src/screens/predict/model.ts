import { nf, usd } from "@/format";
import { ACTIVITY, DATA, POOLS_BY, PREDICT, PX } from "@/sample/data";
import { nowT, randTx } from "@/screens/earn/model";
import { mutate } from "@/state/store";
import * as solanaActions from "@/chain/solana/actions";
import { type LiveEvent, type LiveOutcome, loadPredictEvents, predictPositions, type Prices, predictTrade } from "@/chain/solana/predict";
import { inUseWallet } from "@/state/wallets";
const solanaPredictClaim: (opts: { marketId: string; amount: number }) => Promise<string> = (solanaActions as any).solanaPredictClaim;

/* Predict model (design screens/predict.js, web V7): events in cents (Yes + No = 100-102), order-book quotes, earning while you wait (a share
   earns when it is paired with the other side in its market's pool; each pair is $1 lent in Vanna's USDC pool). Solana only.
   DATA SOURCE: the web app reads World's markets on chain (getProgramAccounts on Solana mainnet + Token-2022 metadata + JanusFI oracle
   quotes, assembled by a gated server route, /api/solana/predict/events, which answers 401 without the site's access code). There is no public
   keyless markets API, so the events below are the V7 sample, shaped like the web PredictEvent / PredictOutcome. */
export type Side = "yes" | "no";
export type EvType = "binary" | "updown" | "match" | "multi" | "date" | "strike";
export type Out = {
  k: string; name: string; col?: string; ini?: string; grp?: string; res?: Side; y: number; n: number; d?: number; vol: number;
  yl?: string; nl?: string; pool: { yes: number; no: number }; uid: string;
  /** World's live quote, in dollars; set on real markets only. */
  live?: Prices;
};
export type Ev = {
  id: string; type: EvType; cat: string; tag: string; icn?: string; asset?: string; title: string; live?: boolean; score?: string; when?: string;
  ends: string; opened: string; vol: number; v24: number; source: string; note?: string; rules: string; exh?: boolean; open?: number; countdown?: string; outs: Out[];
};
type RawOut = Omit<Out, "uid" | "n"> & { n: number };
type RawEv = Omit<Ev, "outs"> & { outs: RawOut[] };

const RAW: RawEv[] =
[
    { id: 'mlb-cle-cws', type: 'match', cat: 'sports', tag: 'MLB', title: 'Guardians vs White Sox', live: true, score: '2 - 3', when: '6th inning',
      ends: 'Oct 7, 2026', opened: 'Oct 1, 2026', vol: 296e3, v24: 210e3, source: 'mlb.com',
      rules: 'Each team has its own Yes or No market, which resolves Yes if that team wins the game (extra innings count). A postponed game stays open until it is played. A cancelled game resolves 50/50.',
      outs: [
        { k: 'cle', name: 'Guardians', col: '#d50032', ini: 'G', y: 47, n: 54, d: -1, vol: 120e3, pool: { yes: 500, no: 520 } },
        { k: 'cws', name: 'White Sox', col: '#27251f', ini: 'W', y: 54, n: 47, d: 1, vol: 132e3, pool: { yes: 640, no: 400 } },
        { k: 'spread', grp: 'spread', name: 'White Sox win by 2 or more runs', y: 35, n: 66, d: 0, vol: 22e3, pool: { yes: 90, no: 120 } },
        { k: 'total', grp: 'total', name: 'Over 8.5 total runs', y: 46, n: 55, d: 2, vol: 22e3, pool: { yes: 200, no: 210 } },
      ] },
    { id: 'fed-oct', type: 'multi', cat: 'economics', tag: 'Fed', icn: 'account_balance', title: 'Fed decision in October?',
      ends: 'Oct 28, 2026', opened: 'Jun 17, 2026', vol: 2.41e6, v24: 186e3, source: 'federalreserve.gov', note: 'Exactly one outcome resolves Yes',
      rules: 'Resolves to the change in the upper bound of the federal funds target range announced after the Oct 27-28 FOMC meeting. Exactly one outcome resolves Yes.',
      outs: [
        { k: 'nochg', name: 'No change', y: 83, n: 18, d: 2, vol: 820e3, pool: { yes: 2400, no: 1900 } },
        { k: 'cut25', name: '25 bps cut', y: 15, n: 86, d: -2, vol: 640e3, pool: { yes: 900, no: 1300 } },
        { k: 'hike25', name: '25 bps hike', y: 2, n: 99, d: 0, vol: 410e3, pool: { yes: 120, no: 300 } },
        { k: 'cut50', name: '50+ bps cut', y: 0.8, n: 99.3, d: 0, vol: 540e3, pool: { yes: 20, no: 60 } },
        { k: 'hike50', name: '50+ bps hike', y: 0.4, n: 99.7, d: 0, vol: 390e3, pool: { yes: 20, no: 30 } },
      ] },
    { id: 'iran-blockade', type: 'date', cat: 'politics', tag: 'Geopolitics', icn: 'public', title: 'US ends Iran blockade by…?',
      ends: 'Mar 31, 2027', opened: 'Jul 14, 2026', vol: 3.12e6, v24: 152e3, source: 'Official US government statements', note: 'A later date includes the earlier ones',
      rules: 'Each date resolves Yes if the US government officially announces the end or suspension of its naval blockade of Iran by that date (11:59 PM ET). A later date includes every earlier one, so its chance is higher.',
      outs: [
        { k: 'aug31', name: 'Aug 31', res: 'no', y: 0, n: 100, vol: 494e3, pool: { yes: 0, no: 0 } },
        { k: 'sep30', name: 'Sep 30', res: 'no', y: 0, n: 100, vol: 559e3, pool: { yes: 0, no: 0 } },
        { k: 'oct15', name: 'Oct 15', y: 11, n: 90, d: -3, vol: 183e3, pool: { yes: 300, no: 900 } },
        { k: 'oct31', name: 'Oct 31', y: 20, n: 81, d: -4, vol: 376e3, pool: { yes: 500, no: 650 } },
        { k: 'nov30', name: 'Nov 30', y: 32, n: 69, d: -2, vol: 81e3, pool: { yes: 220, no: 260 } },
        { k: 'dec31', name: 'Dec 31', y: 49, n: 52, d: -2, vol: 295e3, pool: { yes: 1400, no: 1100 } },
        { k: 'mar31', name: 'Mar 31, 2027', y: 72, n: 29, d: -1, vol: 39e3, pool: { yes: 300, no: 120 } },
      ] },
    { id: 'btc-oct', type: 'strike', cat: 'crypto', tag: 'Bitcoin', asset: 'BTC', title: 'What price will Bitcoin hit in October?', countdown: '24d 9h',
      ends: 'Oct 31, 2026', opened: 'Oct 1, 2026', vol: 1.06e6, v24: 140e3, source: 'Binance BTC/USDT 1-minute candles', note: 'Each target is its own Yes or No market',
      rules: 'Up rows resolve Yes if any Binance BTC/USDT 1-minute candle in October has a high at or above the price; down rows if a low is at or below it.',
      outs: [
        { k: 'u95', name: '↑ 95,000', y: 14, n: 87, d: -3, vol: 107e3, pool: { yes: 300, no: 450 } },
        { k: 'u90', name: '↑ 90,000', y: 37, n: 64, d: -6, vol: 131e3, pool: { yes: 400, no: 380 } },
        { k: 'd80', name: '↓ 80,000', y: 66, n: 35, d: 9, vol: 106e3, pool: { yes: 650, no: 420 } },
        { k: 'd75', name: '↓ 75,000', y: 26, n: 75, d: 4, vol: 163e3, pool: { yes: 200, no: 300 } },
      ] },
    { id: 'nfl-ne-jax', type: 'match', cat: 'sports', tag: 'NFL', title: 'Patriots vs Jaguars', when: 'Sun, Oct 12, 13:00', exh: false,
      ends: 'Oct 12, 2026', opened: 'Sep 1, 2026', vol: 640e3, v24: 120e3, source: 'nfl.com',
      rules: 'Each team has its own Yes or No market, which resolves Yes if that team wins. A tie resolves both markets No.',
      outs: [
        { k: 'ne', name: 'Patriots', col: '#002244', ini: 'P', y: 58, n: 43, d: 3, vol: 330e3, pool: { yes: 800, no: 700 } },
        { k: 'jax', name: 'Jaguars', col: '#006778', ini: 'J', y: 43, n: 58, d: -3, vol: 310e3, pool: { yes: 1100, no: 760 } },
      ] },
    { id: 'sol-week', type: 'updown', cat: 'crypto', tag: 'Solana', asset: 'SOL', title: 'Solana Up or Down this week?', open: 112.40, when: 'Closes in 4d 21h', countdown: '4d 21h',
      ends: 'Oct 12, 2026', opened: 'Oct 5, 2026', vol: 184e3, v24: 96e3, source: 'Pyth SOL/USD',
      rules: 'Resolves Up if SOL/USD on Pyth at Oct 12, 12:00 ET is above the Oct 5, 12:00 ET open ($112.40). Otherwise it resolves Down.',
      outs: [{ k: 'm', name: 'SOL this week', yl: 'Up', nl: 'Down', y: 54, n: 47, d: 6, vol: 184e3, pool: { yes: 500, no: 380 } }] },
    { id: 'lal-bar-osa', type: 'match', cat: 'sports', tag: 'La Liga', title: 'Barcelona vs Osasuna', when: 'Sat, Oct 11, 16:30',
      ends: 'Oct 11, 2026', opened: 'Sep 20, 2026', vol: 312e3, v24: 88e3, source: 'laliga.com',
      rules: 'Three markets: Barcelona wins, Draw, Osasuna wins (90 minutes plus stoppage time). Exactly one resolves Yes.',
      outs: [
        { k: 'bar', name: 'Barcelona', col: '#a50044', ini: 'B', y: 71, n: 30, d: 1, vol: 180e3, pool: { yes: 900, no: 620 } },
        { k: 'draw', name: 'Draw', col: '#6b7280', ini: '=', y: 18, n: 83, d: 0, vol: 61e3, pool: { yes: 160, no: 400 } },
        { k: 'osa', name: 'Osasuna', col: '#0a346f', ini: 'O', y: 12, n: 89, d: -1, vol: 71e3, pool: { yes: 150, no: 300 } },
      ] },
    { id: 'dem-2028', type: 'multi', cat: 'politics', tag: 'US Election', icn: 'how_to_vote', title: 'Democratic nominee 2028?',
      ends: 'Aug 31, 2028', opened: 'Nov 6, 2024', vol: 9.8e6, v24: 74e3, source: 'Democratic National Convention', note: 'Exactly one outcome resolves Yes',
      rules: 'Resolves to the person nominated as the Democratic Party candidate for US President in 2028. Exactly one outcome resolves Yes. "Other" covers everyone not listed.',
      outs: [
        { k: 'aoc', name: 'Alexandria Ocasio-Cortez', y: 18, n: 83, d: 1, vol: 1.5e6, pool: { yes: 600, no: 330 } },
        { k: 'newsom', name: 'Gavin Newsom', y: 17, n: 84, d: 0, vol: 2.8e6, pool: { yes: 700, no: 520 } },
        { k: 'ossoff', name: 'Jon Ossoff', y: 15, n: 86, d: 2, vol: 1.3e6, pool: { yes: 300, no: 260 } },
        { k: 'harris', name: 'Kamala Harris', y: 7, n: 94, d: 0, vol: 1.4e6, pool: { yes: 150, no: 400 } },
        { k: 'shapiro', name: 'Josh Shapiro', y: 6, n: 95, d: 0, vol: 1.0e6, pool: { yes: 90, no: 120 } },
        { k: 'buttigieg', name: 'Pete Buttigieg', y: 5, n: 96, d: 0, vol: 1.2e6, pool: { yes: 60, no: 80 } },
        { k: 'beshear', name: 'Andy Beshear', y: 3, n: 98, d: 0, vol: 0.9e6, pool: { yes: 30, no: 40 } },
        { k: 'moore', name: 'Wes Moore', y: 2, n: 99, d: 0, vol: 0.7e6, pool: { yes: 20, no: 25 } },
        { k: 'other', name: 'Other', y: 28, n: 73, d: 0, vol: 0.4e6, pool: { yes: 120, no: 90 } },
      ] },
    { id: 'house-2026', type: 'multi', cat: 'politics', tag: 'Midterms', icn: 'how_to_vote', title: 'Which party wins the House in 2026?',
      ends: 'Nov 3, 2026', opened: 'Jan 5, 2025', vol: 4.6e6, v24: 66e3, source: 'Official election results', note: 'Exactly one outcome resolves Yes',
      rules: 'Resolves to the party that wins a majority of voting seats in the US House of Representatives in the 2026 midterm election.',
      outs: [
        { k: 'dem', name: 'Democrats', y: 93, n: 8, d: 1, vol: 2.6e6, pool: { yes: 1500, no: 900 } },
        { k: 'rep', name: 'Republicans', y: 8, n: 93, d: -1, vol: 2.0e6, pool: { yes: 300, no: 450 } },
      ] },
    { id: 'btc100k', type: 'binary', cat: 'crypto', tag: 'Bitcoin', asset: 'BTC', title: 'Will Bitcoin reach $100,000 by Dec 31?',
      ends: 'Dec 31, 2026', opened: 'Jan 2, 2026', vol: 1.48e6, v24: 61e3, source: 'Binance BTC/USDT',
      rules: 'Resolves Yes if any Binance BTC/USDT 1-minute candle has a high at or above $100,000 before Dec 31, 2026, 11:59 PM ET.',
      outs: [{ k: 'm', name: 'Bitcoin $100K by Dec 31', y: 18, n: 83, d: -2, vol: 1.48e6, pool: { yes: 1300, no: 900 } }] },
    { id: 'ceasefire', type: 'date', cat: 'politics', tag: 'Geopolitics', icn: 'public', title: 'US-Iran ceasefire holds through…?',
      ends: 'Dec 31, 2026', opened: 'Sep 2, 2026', vol: 820e3, v24: 58e3, source: 'Consensus of credible reporting', note: 'Each later date needs the calm to last longer',
      rules: 'Each date resolves No if the US carries out an air or missile strike on Iran by that date (Iran time). Otherwise it resolves Yes. Later dates need a longer calm, so their chance is lower.',
      outs: [
        { k: 'sep30', name: 'Sep 30', res: 'yes', y: 100, n: 0, vol: 2.45e6, pool: { yes: 0, no: 0 } },
        { k: 'oct15', name: 'Oct 15', y: 91, n: 10, d: 3, vol: 253e3, pool: { yes: 600, no: 200 } },
        { k: 'oct31', name: 'Oct 31', y: 75, n: 26, d: 2, vol: 330e3, pool: { yes: 800, no: 500 } },
        { k: 'nov30', name: 'Nov 30', y: 45, n: 56, d: 4, vol: 133e3, pool: { yes: 150, no: 180 } },
        { k: 'dec31', name: 'Dec 31', y: 35, n: 66, d: 1, vol: 104e3, pool: { yes: 90, no: 140 } },
      ] },
    { id: 'ucl-2027', type: 'multi', cat: 'sports', tag: 'UCL', icn: 'sports_soccer', title: 'Champions League winner 2027?',
      ends: 'May 29, 2027', opened: 'Jul 1, 2026', vol: 2.2e6, v24: 33e3, source: 'uefa.com', note: 'Exactly one outcome resolves Yes',
      rules: 'Resolves to the club that wins the 2026-27 UEFA Champions League final. Exactly one outcome resolves Yes. "Other" covers every club not listed.',
      outs: [
        { k: 'bar', name: 'Barcelona', y: 23, n: 78, d: 1, vol: 520e3, pool: { yes: 300, no: 260 } },
        { k: 'bay', name: 'Bayern Munich', y: 15, n: 86, d: 0, vol: 410e3, pool: { yes: 200, no: 110 } },
        { k: 'ars', name: 'Arsenal', y: 13, n: 88, d: 1, vol: 380e3, pool: { yes: 150, no: 160 } },
        { k: 'psg', name: 'Paris Saint-Germain', y: 11, n: 90, d: -1, vol: 330e3, pool: { yes: 100, no: 140 } },
        { k: 'liv', name: 'Liverpool', y: 9, n: 92, d: 0, vol: 290e3, pool: { yes: 80, no: 90 } },
        { k: 'rma', name: 'Real Madrid', y: 8, n: 93, d: -1, vol: 270e3, pool: { yes: 70, no: 60 } },
        { k: 'other', name: 'Other', y: 22, n: 79, d: 0, vol: 160e3, pool: { yes: 90, no: 70 } },
      ] },
    { id: 'clarity', type: 'binary', cat: 'politics', tag: 'Crypto policy', icn: 'gavel', title: 'Crypto market structure bill signed into law in 2026?',
      ends: 'Dec 31, 2026', opened: 'Mar 3, 2026', vol: 410e3, v24: 21e3, source: 'congress.gov',
      rules: 'Resolves Yes if a federal crypto market structure bill is signed into law by Dec 31, 2026, 11:59 PM ET.',
      outs: [{ k: 'm', name: 'Signed in 2026', y: 34, n: 67, d: 3, vol: 410e3, pool: { yes: 400, no: 520 } }] },
    { id: 'recession', type: 'binary', cat: 'economics', tag: 'US economy', icn: 'monitoring', title: 'US recession in 2026?',
      ends: 'Feb 28, 2027', opened: 'Jan 2, 2026', vol: 690e3, v24: 12e3, source: 'NBER / BEA',
      rules: 'Resolves Yes if the NBER declares a US recession that began in 2026, or BEA reports two consecutive quarters of negative real GDP growth in 2026.',
      outs: [{ k: 'm', name: 'Recession in 2026', y: 9, n: 92, d: 0, vol: 690e3, pool: { yes: 200, no: 650 } }] },
  ];

export const EV: Ev[] = RAW.map((e) => ({ ...e, outs: e.outs.map((o) => ({ ...o, uid: e.id + "/" + o.k })) }));
export const CATS: [string, string][] = [["trending", "Trending"], ["crypto", "Crypto"], ["sports", "Sports"], ["politics", "Politics"], ["economics", "Economics"], ["all", "All"]];

/* ---------- helpers ---------- */
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const r1 = (c: number) => Math.round(c * 10) / 10;
const frac = (c: number) => Math.abs(r1(c) - Math.round(r1(c))) > 1e-9;
export const cf = (c: number) => nf(r1(c), frac(c) ? 1 : 0) + "¢";
export const cpair = (a: number, b: number): [string, string] => { const d = frac(a) || frac(b) ? 1 : 0; return [nf(r1(a), d) + "¢", nf(r1(b), d) + "¢"]; };
export const pc = (v: number) => (v > 0 && v < 1 ? "<1" : nf(v, 0)) + "%";
export const p2 = (v: number) => nf(v, 2) + "%";
export const k2 = (n: number) => (Math.abs(n) >= 1e3 ? "$" + nf(n / 1e3, 2) + "K" : usd(n));
export const shf = (n: number) => nf(n, Math.abs(n) >= 1000 ? 0 : 2);
export const pp = (v: number) => nf(Math.round(v * 100), 0) + "%";
export const usdC = (n: number) => (n >= 1e6 ? "$" + nf(n / 1e6, 2) + "M" : n >= 1e3 ? "$" + nf(n / 1e3, 0) + "K" : usd(n));
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const rng = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TODAY = Date.UTC(2026, 9, 7);
export const dAgo = (n: number) => { const d = new Date(TODAY - n * 864e5); return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`; };
export const endsShort = (d: string) => String(d || "").replace(/, 2026$/, "");

const usdcPool = () => POOLS_BY.solana.find((p) => p.sym === "USDC") ?? { sup: 69750, bor: 52300, supA: 5.4, util: 75 };
export const RATE = () => usdcPool().supA;
const FREE_USDC = () => Math.max(0, usdcPool().sup - usdcPool().bor);
const W = () => DATA.solana.wallet;
export const cashBal = () => (W().USDC ?? 0) + (W().CASH ?? 0);

/* ---------- the sample user (web V7) ---------- */
export type Pos = { id: string; ev: string; o: string; side: Side; sh: number; avg: number; yld: number; t: string; src: "vanna" | "world" | "polymarket"; wallet: string; mergeAt?: number };
export type Hold = { id: string; wallet: string; src: "world" | "polymarket"; ev: string | null; o?: string; side: Side; sh: number; avg: number; pmBid?: number; pmTitle?: string; pmOut?: string };
export type Wallet = { id: string; kind: "solana" | "polymarket"; name: string; addr: string; main?: boolean };
export const P: { seq: number; real: number; yreal: number; wallets: Wallet[]; pos: Pos[]; hold: Hold[] } = {
  seq: 20, real: 0, yreal: 0,
  wallets: [{ id: "w1", kind: "solana", name: "Main wallet", addr: "7xKX…9fQ2", main: true }],
  pos: [
    { id: "pp1", ev: "nfl-ne-jax", o: "jax", side: "yes", sh: 300, avg: 0.41, yld: 0.92, t: "Sep 7", src: "vanna", wallet: "w1" },
    { id: "pp2", ev: "fed-oct", o: "cut25", side: "yes", sh: 400, avg: 0.12, yld: 1.18, t: "Sep 17", src: "vanna", wallet: "w1" },
    { id: "pp3", ev: "iran-blockade", o: "dec31", side: "yes", sh: 250, avg: 0.44, yld: 0.73, t: "Sep 12", src: "vanna", wallet: "w1" },
    { id: "pp4", ev: "lal-bar-osa", o: "bar", side: "yes", sh: 150, avg: 0.64, yld: 0.14, t: "Sep 28", src: "vanna", wallet: "w1" },
    { id: "pp5", ev: "ceasefire", o: "sep30", side: "yes", sh: 150, avg: 0.8, yld: 0.45, t: "Sep 3", src: "vanna", wallet: "w1" },
  ],
  hold: [
    { id: "h1", wallet: "w1", src: "world", ev: "btc100k", o: "m", side: "no", sh: 220, avg: 0.78 },
    { id: "h2", wallet: "w1", src: "world", ev: "dem-2028", o: "newsom", side: "yes", sh: 200, avg: 0.14 },
  ],
};
const FIND: Record<"solana" | "polymarket", { name: string; addr: string; hold: Omit<Hold, "id" | "wallet" | "src">[] }[]> = {
  solana: [
    { name: "Trading wallet", addr: "9pRtXk…Lw4c", hold: [{ ev: "ceasefire", o: "nov30", side: "no", sh: 150, avg: 0.52 }, { ev: "sol-week", o: "m", side: "yes", sh: 120, avg: 0.5 }] },
    { name: "Solana wallet", addr: "4fQzA2…Tn8e", hold: [{ ev: "house-2026", o: "rep", side: "no", sh: 300, avg: 0.9 }] },
  ],
  polymarket: [
    { name: "Polymarket", addr: "0x3f2c…a91c", hold: [
      { ev: "fed-oct", o: "nochg", side: "yes", sh: 500, avg: 0.79, pmBid: 82.5, pmTitle: "Fed Decision in October?", pmOut: "No change" },
      { ev: "ceasefire", o: "oct31", side: "yes", sh: 300, avg: 0.7, pmBid: 74, pmTitle: "US x Iran ceasefire continues through October 31?", pmOut: "Oct 31" },
      { ev: null, side: "yes", sh: 1000, avg: 0.15, pmBid: 17, pmTitle: "Elon Musk # tweets October 6 - October 13, 2026?", pmOut: "240-259 tweets" },
    ] },
    { name: "Polymarket 2", addr: "0x8b71…04de", hold: [{ ev: null, side: "yes", sh: 400, avg: 0.21, pmBid: 23, pmTitle: "Ballon d'Or winner 2026?", pmOut: "Harry Kane" }] },
  ],
};

/* ---------- market maths (web V7) ---------- */
export const EVM = (id?: string) => EV.find((e) => e.id === id);
export const OUT = (e: Ev | undefined, k?: string) => e?.outs.find((o) => o.k === k);
export const yl = (o: Out) => o.yl || "Yes";
export const nl = (o: Out) => o.nl || "No";
export const lab = (o: Out, s: Side) => (s === "yes" ? yl(o) : nl(o));
export const ask = (o: Out, s: Side) => (o.live ? ((s === "yes" ? o.live.yesAsk : o.live.noAsk) ?? 0) * 100 : s === "yes" ? o.y : o.n);
const tick = (c: number) => (c <= 1 || c > 99 ? 0.1 : 1);
export const bid = (o: Out, s: Side) => { if (o.live) return ((s === "yes" ? o.live.yesBid : o.live.noBid) ?? 0) * 100; const a = ask(o, s); return Math.max(0, +(a - tick(a)).toFixed(1)); };
export const openOuts = (e: Ev) => e.outs.filter((o) => !o.res);
export const mainOuts = (e: Ev) => openOuts(e).filter((o) => !o.grp);
export const isOther = (o: Out) => o.k === "other";
export const byChance = (a: Out, b: Out) => (Number(isOther(a)) - Number(isOther(b))) || b.y - a.y;
export const mName = (e: Ev, o: Out) => (e.outs.length > 1 ? o.name : e.title);
export const evLabel = (e: Ev, o: Out) => (e.outs.length > 1 ? `${e.title}${/\?$/.test(e.title) ? "" : ","} ${o.name}` : e.title);
export const posTitle = (e: Ev, o: Out) => (e.type === "date" ? e.title.replace("…?", " " + o.name + "?") : e.title);
export const team = (o: Out) => !!o.col;
export const single = (e: Ev) => e.type === "binary" || e.type === "updown";
export const whenOf = (e: Ev) => e.when || `Ends ${endsShort(e.ends)}`;

type Lvl = { p: number; q: number };
const BK: Record<string, Lvl[]> = {};
export function levels(o: Out, s: Side, dir: 1 | -1): Lvl[] {
  const key = o.uid + "/" + s + (dir > 0 ? "/a" : "/b");
  if (BK[key]) return BK[key];
  const r = rng(hash(key)), p0 = dir > 0 ? ask(o, s) : bid(o, s), depthUsd = Math.max(2500, (o.vol || 50e3) * 0.02);
  const base = (depthUsd / 6 / Math.max(p0, 0.5)) * 100, out: Lvl[] = [];
  let p = p0;
  for (let i = 0; i < 60 && p > 0 && p < 100; i++) {
    out.push({ p: +p.toFixed(1), q: Math.round(base * (0.45 + r() * 1.1) * (1 + i * 0.12)) });
    p = +(p + (dir > 0 ? (p < 1 || p >= 99 ? 0.1 : 1) : -(p <= 1 || p > 99 ? 0.1 : 1))).toFixed(1);
  }
  return (BK[key] = out);
}
export function qBuy(o: Out, s: Side, usdAmt: number) {
  // A real market fills at one price, exactly what the transaction uses.
  if (o.live) { const a = ask(o, s); return { avg: a, sh: usdAmt > 0 && a > 0 ? usdAmt / (a / 100) : 0 }; }
  const lv = levels(o, s, 1);
  if (!(usdAmt > 0) || !lv.length) return { avg: ask(o, s), sh: 0 };
  let left = usdAmt, sh = 0;
  for (const l of lv) {
    const cost = (l.q * l.p) / 100;
    if (cost >= left) { sh += left / (l.p / 100); left = 0; break; }
    sh += l.q; left -= cost;
  }
  const spent = usdAmt - left;
  return { avg: sh ? (spent / sh) * 100 : ask(o, s), sh };
}
export function qSell(o: Out, s: Side, n: number) {
  if (o.live) { const b = bid(o, s); return { avg: b, usd: n > 0 ? (n * b) / 100 : 0 }; }
  const lv = levels(o, s, -1);
  if (!(n > 0) || !lv.length) return { avg: bid(o, s), usd: 0 };
  let left = n, got = 0;
  for (const l of lv) { const take = Math.min(left, l.q); got += (take * l.p) / 100; left -= take; if (left <= 1e-9) break; }
  const sold = n - left;
  return { avg: sold ? (got / sold) * 100 : bid(o, s), usd: got };
}
/* one side of one market's pool; add = shares about to come in; share = part of this side that is paired (earns) */
export function side(o: Out, s: Side, add = 0) {
  const mine = o.pool[s] + add, other = o.pool[s === "yes" ? "no" : "yes"], matched = Math.min(mine, other);
  const share = mine > 0 ? matched / mine : other > 0 ? 1 : 0;
  return { mine, other, matched, share, apy: RATE() * share, full: mine <= other, waiting: Math.max(0, mine - other) };
}
export const pairsOf = (o: Out) => (o.res ? 0 : Math.min(o.pool.yes, o.pool.no));
const lentOf = (e: Ev) => openOuts(e).reduce((t, o) => t + pairsOf(o), 0);
export const totalPairs = () => EV.reduce((t, e) => t + lentOf(e), 0);
function sellRoute(o: Out, s: Side, n: number) {
  const sd = side(o, s), fromPool = Math.min(n, sd.waiting), needUsd = Math.max(0, n - fromPool);
  return { fromPool, needUsd, free: FREE_USDC() };
}
export const posOf = (e: Ev, o: Out, s: Side) => P.pos.find((p) => p.ev === e.id && p.o === o.k && p.side === s);
export const heldOf = (e: Ev, o: Out, s: Side) => { const p = posOf(e, o, s); return p ? Math.max(0, p.sh + p.yld) : 0; };
const resOf = (p: Pos) => OUT(EVM(p.ev), p.o)?.res ?? null;
export const openPos = () => P.pos.filter((p) => !resOf(p));
export const resPos = () => P.pos.filter((p) => resOf(p));
export function pmx(p: Pos) {
  const e = EVM(p.ev)!, o = OUT(e, p.o)!, tot = p.sh + p.yld, cost = p.sh * p.avg;
  if (o.res) {
    const won = o.res === p.side, mk = won ? 1 : 0, value = tot * mk;
    return { e, o, tot, mk, value, cost, pnl: value - cost, inVault: 0, earned: p.yld * mk, apy: 0, pays: value, sd: side(o, p.side), merging: false, res: true, won, claim: value };
  }
  const mk = bid(o, p.side) / 100, sd = side(o, p.side), joining = !!(p.mergeAt && Date.now() < p.mergeAt), value = tot * mk;
  return { e, o, tot, mk, value, cost, pnl: value - cost, inVault: joining ? 0 : tot * sd.share * mk, earned: p.yld * mk, apy: joining ? 0 : sd.apy, pays: tot, sd, merging: joining, res: false, won: false, claim: 0 };
}
export function holdx(h: Hold) {
  const e = h.ev ? EVM(h.ev) : undefined, o = e ? OUT(e, h.o) : undefined, L = o ? lab(o, h.side) : h.side === "yes" ? "Yes" : "No";
  const price = h.src === "polymarket" ? (h.pmBid ?? 0) : o ? bid(o, h.side) : 0, value = (h.sh * price) / 100, cost = h.sh * h.avg;
  const sd = o ? side(o, h.side, h.sh) : null;
  return { e, o, L, price, value, cost, pnl: value - cost, listed: !!o, apyIf: sd ? sd.apy : 0, shareIf: sd ? sd.share : 0,
    title: h.src === "polymarket" || !e ? (h.pmTitle ?? "") : e.title, out: h.src === "polymarket" || !o || !e ? (h.pmOut ?? "") : mName(e, o) };
}
export const walletOf = (id: string) => P.wallets.find((w) => w.id === id);
export const worldIdle = () => P.hold.filter((h) => h.src === "world");
export const yourApy = (ps: { value: number; apy: number }[]) => { const v = ps.reduce((t, m) => t + m.value, 0); return v ? ps.reduce((t, m) => t + m.value * m.apy, 0) / v : 0; };
/* The most all open positions can pay together: in a team / multi-outcome event only one outcome wins, so take the best case there. */
function maxPayout() {
  const all = openPos().map((p) => ({ ev: p.ev as string | null, o: p.o as string | undefined, side: p.side, n: p.sh + p.yld })).concat(P.hold.map((h) => ({ ev: h.ev, o: h.o, side: h.side, n: h.sh })));
  let t = all.filter((x) => !x.ev).reduce((a, x) => a + x.n, 0);
  EV.forEach((e) => {
    const ps = all.filter((x) => x.ev === e.id);
    if (!ps.length) return;
    if (e.type !== "match" && e.type !== "multi") { t += ps.reduce((a, x) => a + x.n, 0); return; }
    const main = ps.filter((x) => !OUT(e, x.o)?.grp);
    t += ps.filter((x) => OUT(e, x.o)?.grp).reduce((a, x) => a + x.n, 0);
    const wins: (string | null)[] = e.outs.filter((o) => !o.grp && !o.res).map((o) => o.k);
    if (e.exh === false) wins.push(null);
    t += Math.max(0, ...wins.map((w) => main.reduce((a, x) => a + ((x.side === "yes") === (x.o === w) ? x.n : 0), 0)));
  });
  return t;
}
/* Two-team games with no draw: No on one team is the same bet as Yes on the other (except a tie in the NFL). */
export function twinOf(e: Ev, o: Out, s: Side) {
  if (e.type !== "match" || o.grp) return null;
  const ps = e.outs.filter((x) => !x.grp);
  if (ps.length !== 2) return null;
  return { o: ps.find((x) => x !== o)!, s: (s === "yes" ? "no" : "yes") as Side, tie: e.exh === false };
}

/* ---------- pairing history ("Paired 60% to 69% today") ---------- */
const PH: Record<string, { t: string; v: number }[]> = {};
const phKey = (o: Out, s: Side) => o.uid + "/" + s;
export const pairingHist = (o: Out, s: Side) => PH[phKey(o, s)] ?? [];
function seedPH() {
  openPos().forEach((p) => {
    const o = OUT(EVM(p.ev), p.o)!, k = phKey(o, p.side);
    if (PH[k]) return;
    const cur = Math.round(side(o, p.side).share * 100), r = rng(hash(k + "/ph"));
    const prev = cur >= 100 ? 92 + Math.floor(r() * 5) : Math.max(15, cur - 4 - Math.floor(r() * 9));
    PH[k] = [{ t: "Oct 6", v: prev }, { t: "today", v: cur }];
  });
}
const pairSnap = () => {
  const m: Record<string, { o: Out; e: Ev; s: Side; v: number }> = {};
  openPos().forEach((p) => { const e = EVM(p.ev)!, o = OUT(e, p.o)!; m[phKey(o, p.side)] = { o, e, s: p.side, v: Math.round(side(o, p.side).share * 100) }; });
  return m;
};
function withPairing(fn: () => void) {
  const before = pairSnap();
  fn();
  const after = pairSnap();
  Object.keys(after).forEach((k) => {
    const a = before[k], b = after[k], was = a ? a.v : null;
    if (!PH[k]) PH[k] = [];
    if (was === null) { PH[k].push({ t: "today", v: b.v }); return; }
    if (b.v !== was) {
      PH[k].push({ t: "today", v: b.v });
      log("Pairing", `Paired ${was}% to ${b.v}%`, `Paired ${was}% to ${b.v}%`, 0);
    }
  });
}

/* ---------- summary (Hero / Portfolio read these) ---------- */
export function summary() {
  const xs = openPos().map(pmx), rs = resPos().map(pmx), hs = P.hold.map(holdx), sum = <T,>(a: T[], f: (m: T) => number) => a.reduce((t, m) => t + f(m), 0);
  const openV = sum(xs, (m) => m.value) + sum(hs, (x) => x.value), openC = sum(xs, (m) => m.cost) + sum(hs, (x) => x.cost);
  const claimable = sum(rs, (m) => m.claim), upnl = openV - openC, realized = P.real + sum(rs, (m) => m.value - m.cost);
  const earned = sum(xs, (m) => m.earned) + sum(rs, (m) => m.earned) + P.yreal;
  return {
    value: openV + sum(rs, (m) => m.value), cost: openC + sum(rs, (m) => m.cost), upnl, realized, pnl: upnl + realized - earned, claimable, cash: cashBal(),
    inVault: sum(xs, (m) => m.inVault), earned, apy: yourApy(xs), payout: maxPayout(), count: xs.length + hs.length, resolved: rs.length,
    idle: sum(worldIdle().map(holdx), (x) => x.value),
  };
}
export const vaultDeposited = () => totalPairs();

/* ---------- keep the app-wide sample (Portfolio, Home) in step with the open positions ---------- */
export function syncPredict() {
  PREDICT.length = 0;
  openPos().forEach((p) => {
    const m = pmx(p);
    PREDICT.push({ eventId: p.ev, event: posTitle(m.e, m.o), market: p.side === "yes" ? mName(m.e, m.o) : `${mName(m.e, m.o)} (No)`, shares: m.tot, avg: p.avg, mark: m.mk, earned: m.earned, apy: m.apy });
  });
}
function log(action: string, detail: string, amt: string, usdv: number, sym = "USDC") {
  ACTIVITY.solana.unshift({ t: nowT(), area: "Predict", action, detail, amt, usd: usdv, tx: randTx(), sym });
}

/* ---------- World's real markets ---------- */
export function clearSamplePredict() {
  EV.length = 0;
  P.pos = [];
  P.hold = [];
  P.real = 0;
  P.yreal = 0;
}

const toOut = (o: LiveOutcome): Out => ({
  k: o.marketId, uid: o.marketId, name: o.name, live: { yesAsk: o.yesAsk, noAsk: o.noAsk, yesBid: o.yesBid, noBid: o.noBid },
  y: (o.yesAsk ?? 0) * 100, n: (o.noAsk ?? 0) * 100, d: 0, vol: 0, pool: { yes: 0, no: 0 },
});
const toEv = (e: LiveEvent): Ev => ({
  id: e.id, type: e.outs.length > 1 ? "multi" : "binary", cat: e.cat, tag: e.tag, title: e.title, ends: e.ends, opened: "", vol: e.vol, v24: 0, source: e.source, rules: e.rules,
  outs: e.outs.map(toOut),
});
let liveAt = 0;
let liveOuts: LiveOutcome[] = [];
let liveLoading: Promise<void> | null = null;

/** Replaces the sample markets with World's, and the sample positions with what the wallet holds on the fork. */
export function refreshLivePredict(force = false): Promise<void> {
  if (!force && Date.now() - liveAt < 30_000) return Promise.resolve();
  liveLoading ??= (async () => {
    const events = await loadPredictEvents();
    if (!events.length) return;
    const wallet = inUseWallet("solana");
    const owner = wallet && !wallet.sample ? wallet.full : null;
    liveOuts = events.flatMap((e) => e.outs);
    const held = owner ? await predictPositions(owner, liveOuts) : [];
    mutate(() => {
      EV.splice(0, EV.length, ...events.map(toEv));
      const before = P.pos;
      P.hold = [];
      P.pos = held.flatMap((h) => {
        const ev = EV.find((e) => e.outs.some((o) => o.k === h.marketId));
        const out = ev?.outs.find((o) => o.k === h.marketId);
        if (!ev || !out) return [];
        const old = before.find((x) => x.ev === ev.id && x.o === out.k && x.side === h.side);
        return [{ id: `w-${h.marketId}-${h.side}`, ev: ev.id, o: out.k, side: h.side, sh: h.shares, avg: old?.avg ?? ask(out, h.side) / 100, yld: 0, t: old?.t ?? nowT().split(",")[0], src: "vanna" as const, wallet: "w1" }];
      });
      syncPredict();
    });
    liveAt = Date.now();
  })().finally(() => {
    liveLoading = null;
  });
  return liveLoading;
}
const afterTrade = () => setTimeout(() => void refreshLivePredict(true).catch(() => {}), 1500);
async function sendTrade(opts: Parameters<typeof predictTrade>[0]) {
  const hash = await predictTrade(opts);
  afterTrade();
  return hash;
}

const later = () => setTimeout(() => mutate(syncPredict), 3700);   // a new position "joins the pool" for a moment, then earns

/* ---------- trade state (one shared by the sheet and its pinned footer) ---------- */
export type Trade = { ev: string; m: string; side: Side; mode: "buy" | "sell"; amt: string; pay: "USDC" | "CASH"; det: boolean; list: boolean };
export const fmtAmt = (s: string) => {
  const c = s.replace(/[^0-9.]/g, ""), i = c.indexOf(".");
  const v = i < 0 ? c : c.slice(0, i + 1) + c.slice(i + 1).replace(/\./g, "").slice(0, 2);
  return v;
};
export const parseAmt = (s: string) => { const v = parseFloat(s); return isFinite(v) ? v : 0; };
let lastPay: "USDC" | "CASH" = "USDC";
export function newTrade(e: Ev, m?: string, sd?: string, mode?: string): Trade {
  const o = OUT(e, m), ok = o && !o.res ? o : undefined;
  const k = ok ? ok.k : e.type === "multi" ? mainOuts(e).slice().sort(byChance)[0].k : mainOuts(e)[0].k, oo = OUT(e, k)!;
  const held = (["yes", "no"] as Side[]).find((s) => posOf(e, oo, s));
  const side0: Side = sd === "yes" || sd === "no" ? sd : held || "yes";
  const t: Trade = { ev: e.id, m: k, side: side0, mode: mode === "sell" && heldOf(e, oo, side0) ? "sell" : "buy", amt: "100", pay: lastPay, det: false, list: false };
  if (t.mode === "sell") t.amt = fmtAmt(String(Math.floor(heldOf(e, oo, t.side) * 100) / 100));
  return t;
}
export const setLastPay = (p: "USDC" | "CASH") => { lastPay = p; };

export function quote(e: Ev, o: Out, t: Trade, signedIn = true) {
  const s = t.side, a = parseAmt(t.amt), held = heldOf(e, o, s), wal = W()[t.pay] ?? 0;
  if (t.mode === "sell") {
    const n = a > 0 && held - Math.min(a, held) < 0.01 ? held : Math.min(a, held), q = qSell(o, s, n), p = posOf(e, o, s), tot = p ? p.sh + p.yld : 0;
    const ySh = p && tot ? (n * p.yld) / tot : 0, cost = p && tot ? ((n * p.sh) / tot) * p.avg : 0, r = sellRoute(o, s, n);
    const cta: [string, boolean, string?] = !signedIn ? ["Sign in to trade", false, "out"] : !held ? [`You hold no ${lab(o, s)} here`, true] : !(a > 0) ? ["Enter shares", true, "empty"] : a > held + 1e-9 ? ["Not enough shares", true] : [`Sell ${shf(n)} ${lab(o, s)}`, false];
    return { sell: true as const, a, n, q, held, ySh, cost, pnl: q.usd - cost, r, cta, wal, before: side(o, s), after: side(o, s) };
  }
  const q = qBuy(o, s, a), before = side(o, s), after = side(o, s, q.sh);
  const cta: [string, boolean, string?] = !signedIn ? ["Sign in to trade", false, "out"] : !(a > 0) ? ["Enter an amount", true, "empty"] : a > wal + 1e-9 ? [`Not enough ${t.pay}`, true] : [`Buy ${lab(o, s)} for ${usd(a)}`, false];
  return { sell: false as const, a, n: 0, q: { ...q, usd: 0 }, held, wal, before, after, cta, ySh: 0, cost: 0, pnl: 0, r: sellRoute(o, s, 0) };
}
export type Quote = ReturnType<typeof quote>;

/* ---------- history charts ---------- */
const HC: Record<string, number[]> = {};
export function hist(o: Out) {
  if (HC[o.uid]) return HC[o.uid];
  // No real price history is available yet, so a live market shows its current price rather than an invented line.
  if (o.live) return (HC[o.uid] = Array.from({ length: 120 }, () => +o.y.toFixed(1)));
  const N = 120, r = rng(hash(o.uid)), end = o.res ? (o.res === "yes" ? 100 : 0) : o.y, start = clamp(end + (r() - 0.5) * 44, 2, 97), ws: number[] = [];
  let w = 0;
  for (let i = 0; i < N; i++) { w += (r() - 0.5) * 4.2; ws.push(w); }
  const last = ws[N - 1], pts: number[] = [];
  for (let i = 0; i < N; i++) { const t = i / (N - 1); pts.push(+clamp(start + (end - start) * t + ws[i] - t * last, 0.5, 99.5).toFixed(1)); }
  pts[N - 1] = end;
  return (HC[o.uid] = pts);
}
export function seriesOf(e: Ev): [Out, number][] {
  const ops = mainOuts(e);
  if (e.type === "match") {
    const t = ops.filter((o) => o.k !== "draw"), d = ops.find((o) => o.k === "draw");
    return [[t[0], 0] as [Out, number], [t[t.length - 1], 1] as [Out, number]].concat(d ? [[d, 3] as [Out, number]] : []);
  }
  return ops.filter((o) => !isOther(o)).sort(byChance).slice(0, single(e) ? 1 : 3).map((o, i) => [o, i] as [Out, number]);
}
export const livePx = (asset: string) => (PX as Record<string, number>)[asset] ?? 0;

/* ---------- transactions: each builds a TxSpec for runTx (apply runs inside mutate) ---------- */
const sdName = (s: Side) => (s === "yes" ? "Yes" : "No");
export function tradeSpec(t: Trade) {
  const e = EVM(t.ev)!, o = OUT(e, t.m)!, Q = quote(e, o, t), s = t.side, L = lab(o, s), nm = mName(e, o);
  if (Q.cta[1] || Q.cta[2] === "out") return null;
  const view: [string, () => void] = ["View my bets", () => {}];
  if (!Q.sell) {
    const a = Q.a, q = Q.q, pay = t.pay, fx = Q.after;
    return {
      title: "Review buy", cta: `Buy ${L}`,
      legs: [{ l: "You pay", v: `${nf(a, 2)} ${pay}`, s: pay === "USDC" ? "Swapped to CASH at par first" : "From your wallet" }, { l: "You get", v: `${shf(q.sh)} ${L} shares`, s: evLabel(e, o) }],
      rows: [["Avg price", cf(q.avg)], ["Pays if right", usd(q.sh)], ["Profit if right", (q.sh - a >= 0 ? "+" : "−") + usd(Math.abs(q.sh - a)), "pos"], ["Earns while you wait", `${p2(fx.apy)} APY`, "pos"], ["Paired", `${pp(fx.share)} of these shares`]] as [string, string, ("pos" | "neg" | "")?][],
      done: { title: `You bought ${shf(q.sh)} ${L}`, line: `${nm}. Earning on ${pp(fx.share)} of them once they join the pool.` }, view,
      send: async () => await sendTrade({ marketId: o.uid || e.id, outcome: s, side: "buy", amount: a, pay }),
      apply: () => {
        withPairing(() => {
          const qq = qBuy(o, s, a);
          W()[pay] = Math.max(0, (W()[pay] ?? 0) - a);
          o.pool[s] += qq.sh; o.vol += a; e.vol += a; e.v24 += a;
          let p = posOf(e, o, s);
          if (p) { const c = p.sh * p.avg + a; p.sh += qq.sh; p.avg = c / p.sh; }
          else { p = { id: "pp" + ++P.seq, ev: e.id, o: o.k, side: s, sh: qq.sh, avg: qq.avg / 100, yld: 0, t: nowT().split(",")[0], src: "vanna", wallet: "w1" }; P.pos.push(p); }
          p.mergeAt = Date.now() + 3500;
          log("Buy", `Bought ${L} on ${nm}`, `${shf(qq.sh)} ${L} for ${nf(a, 2)} ${pay}`, -a, pay);
        });
        syncPredict(); later();
        lastPay = pay;
      },
    };
  }
  const n = Q.n, q = Q.q;
  return {
    title: "Review sell", cta: `Sell ${L}`,
    legs: [{ l: "You sell", v: `${shf(n)} ${L} shares`, s: evLabel(e, o) }, { l: "You receive", v: `${nf(q.usd, 2)} USDC`, s: "To your wallet" }],
    rows: [["Avg price", cf(q.avg)], ["Includes yield", `${shf(Q.ySh)} shares`], ["P&L on these", (Q.pnl >= 0 ? "+" : "−") + usd(Math.abs(Q.pnl)), Q.pnl >= 0 ? "pos" : "neg"], ["How it sells", Q.r.needUsd > 0.005 ? "Unpaired first, then USDC from the pool" : "Unpaired shares, no USDC needed"]] as [string, string, ("pos" | "neg" | "")?][],
    done: { title: `Sold ${shf(n)} ${L}`, line: `${usd(q.usd)} is back in your wallet` }, view,
    send: async () => await sendTrade({ marketId: o.uid || e.id, outcome: s, side: "sell", amount: n }),
    apply: () => {
      const p = posOf(e, o, s);
      if (!p) return;
      withPairing(() => {
        const tot = p.sh + p.yld, nn = Math.min(n, tot), qq = qSell(o, s, nn), f = nn / tot;
        P.real += qq.usd - p.sh * f * p.avg; P.yreal += p.yld * f * (nn ? qq.usd / nn : 0);
        p.sh -= p.sh * f; p.yld -= p.yld * f;
        o.pool[s] = Math.max(0, o.pool[s] - nn); o.vol += qq.usd; e.vol += qq.usd;
        W().USDC = (W().USDC ?? 0) + qq.usd;
        if (p.sh + p.yld < 1e-6) P.pos = P.pos.filter((x) => x !== p);
        log("Sell", `Sold ${L} on ${nm}`, `${shf(nn)} ${L} for ${nf(qq.usd, 2)} USDC`, qq.usd);
      });
      syncPredict();
    },
  };
}
export function claimSpec(id: string) {
  const p = P.pos.find((x) => x.id === id);
  if (!p) return null;
  const m = pmx(p);
  if (!m.res || !m.won) return null;
  const L = lab(m.o, p.side);
  return {
    title: "Review claim", cta: `Claim ${usd(m.claim)}`,
    legs: [{ l: "You claim", v: `${shf(m.tot)} ${L} shares`, s: `${evLabel(m.e, m.o)}, ${L} won` }, { l: "You receive", v: `${nf(m.claim, 2)} CASH`, s: "To your wallet, ready for the next bet" }],
    rows: [["Result", `${L} won`, "pos"], ["Each share pays", "$1 (1 CASH)"], ["Profit", (m.pnl >= 0 ? "+" : "−") + usd(Math.abs(m.pnl)), m.pnl >= 0 ? "pos" : "neg"]] as [string, string, ("pos" | "neg" | "")?][],
    done: { title: `Claimed ${usd(m.claim)}`, line: "CASH is in your wallet, ready for the next bet" },
    send: async () => await solanaPredictClaim({ marketId: (p as any).marketId || m.o?.uid || p.ev, amount: (p as any).shares || m.claim }),
    apply: () => {
      const q = P.pos.find((x) => x.id === id);
      if (!q) return;
      W().CASH = (W().CASH ?? 0) + m.claim;
      P.real += m.claim - m.cost; P.yreal += m.earned;
      P.pos = P.pos.filter((x) => x !== q);
      log("Claim", `Claimed ${posTitle(m.e, m.o).replace(/\?$/, "")}`, `${shf(m.tot)} ${L} for ${nf(m.claim, 2)} CASH`, m.claim, "CASH");
      syncPredict();
    },
  };
}
export function startSpec(ids: string[]) {
  const hs = P.hold.filter((h) => ids.includes(h.id) && h.src === "world");
  if (!hs.length) return null;
  const xs = hs.map((h) => [h, holdx(h)] as const), v = xs.reduce((t, [, x]) => t + x.value, 0), w = walletOf(hs[0].wallet);
  return {
    title: "Review start earning", cta: "Start earning",
    legs: [{ l: "You put in the pool", v: hs.length > 1 ? `${hs.length} World positions` : `${shf(hs[0].sh)} ${xs[0][1].L} shares`, s: `${usd(v)} from ${w ? w.name : "your wallet"}` }, { l: "They earn", v: `up to ${p2(Math.max(...xs.map(([, x]) => x.apyIf)))} APY`, s: "While you wait for the result" }],
    rows: xs.map(([h, x]) => [`${x.L}, ${x.out}`, `${shf(h.sh)} shares, earns ${p2(x.apyIf)}`] as [string, string]).concat([["Still yours", "Withdraw to your wallet any time"]]) as [string, string, ("pos" | "neg" | "")?][],
    done: { title: hs.length > 1 ? `${hs.length} positions earning` : "Now earning", line: `${usd(v)} of World shares in Vanna's pool` },
    apply: () => {
      withPairing(() => hs.forEach((h) => {
        if (!P.hold.includes(h) || !h.ev) return;
        const e = EVM(h.ev)!, o = OUT(e, h.o)!, x = holdx(h);
        o.pool[h.side] += h.sh;
        P.pos.push({ id: "pp" + ++P.seq, ev: h.ev, o: h.o!, side: h.side, sh: h.sh, avg: h.avg, yld: 0, t: nowT().split(",")[0], src: "world", wallet: h.wallet, mergeAt: Date.now() + 3500 });
        P.hold = P.hold.filter((z) => z !== h);
        log("Start earning", `Started earning on ${x.out}`, `${shf(h.sh)} ${x.L} worth ${usd(x.value)}`, 0);
      }));
      syncPredict(); later();
    },
  };
}
export function withdrawSpec(id: string) {
  const p = P.pos.find((x) => x.id === id && x.src === "world");
  if (!p) return null;
  const m = pmx(p), e = m.e, o = m.o, n = m.tot, L = lab(o, p.side), w = walletOf(p.wallet);
  return {
    title: "Review withdraw", cta: "Withdraw to wallet",
    legs: [{ l: "You withdraw", v: `${shf(n)} ${L} shares`, s: evLabel(e, o) }, { l: "To", v: w ? w.name : "Your wallet", s: "They stop earning" }],
    rows: [["Earning now", p2(m.apy)], ["After", "Not earning, still in your portfolio"]] as [string, string, ("pos" | "neg" | "")?][],
    done: { title: `${shf(n)} ${L} back in your wallet`, line: "They no longer earn" },
    apply: () => {
      if (!P.pos.includes(p)) return;
      withPairing(() => {
        o.pool[p.side] = Math.max(0, o.pool[p.side] - n);
        P.pos = P.pos.filter((x) => x !== p);
        P.hold.push({ id: "h" + ++P.seq, wallet: p.wallet, src: "world", ev: p.ev, o: p.o, side: p.side, sh: n, avg: (p.sh * p.avg) / n });
        log("Withdraw", `Withdrew ${L} to ${w ? w.name : "wallet"}`, `${shf(n)} ${L}`, 0);
      });
      syncPredict();
    },
  };
}
export function mvQuote(h: Hold) {
  const e = EVM(h.ev!)!, o = OUT(e, h.o)!, bidP = h.pmBid ?? 0;
  const sellAvg = Math.max(0.1, bidP * (1 - (0.6 * ((h.sh * bidP) / 100)) / 60e3));
  const proceeds = (h.sh * sellAvg) / 100, bridge = 0.4, cash = proceeds - bridge;
  const qb = qBuy(o, h.side, cash), sd = side(o, h.side, qb.sh), lossSh = h.sh - qb.sh, a0 = ask(o, h.side);
  const sellSlip = ((bidP - sellAvg) / bidP) * 100, buySlip = ((qb.avg - a0) / a0) * 100;
  return { sellAvg, proceeds, cash, buyAvg: qb.avg, after: qb.sh, lossSh, lossUsd: (lossSh * qb.avg) / 100, apy: sd.apy, mo: (cash * sd.share * RATE()) / 100 / 12,
    limit: Math.ceil((Math.max(sellSlip, buySlip) + 0.5) * 2) / 2, realised: proceeds - h.sh * h.avg };
}
export function bringSpec(id: string) {
  const h = P.hold.find((x) => x.id === id && x.src === "polymarket");
  if (!h || !h.ev) return null;
  const e = EVM(h.ev)!, o = OUT(e, h.o)!, L = lab(o, h.side), q = mvQuote(h);
  return {
    title: "Review move", cta: "Bring to Vanna",
    legs: [{ l: "You sell on Polymarket", v: `${shf(h.sh)} ${L} shares`, s: `at ${cf(q.sellAvg)} on average` }, { l: "You get on Vanna", v: `${shf(q.after)} ${L} shares`, s: `at ${cf(q.buyAvg)}, earning ${p2(q.apy)}` }],
    rows: [["Shares", `${shf(h.sh)} to ${shf(q.after)}`], ["Cost of moving", `${shf(q.lossSh)} shares, about ${usd(q.lossUsd)}`], ["Earns once here", `${p2(q.apy)} APY, +${usd(q.mo)} a month`, "pos"], ["Price limit", `${nf(q.limit, 1)}%`], ["You approve", "Once on Polymarket, once on Solana"]] as [string, string, ("pos" | "neg" | "")?][],
    done: { title: "Now earning on Vanna", line: `${shf(q.after)} ${L}, ${mName(e, o)}` },
    apply: () => {
      if (!P.hold.includes(h)) return;
      withPairing(() => {
        o.pool[h.side] += q.after;
        P.pos.push({ id: "pp" + ++P.seq, ev: h.ev!, o: h.o!, side: h.side, sh: q.after, avg: q.cash / q.after, yld: 0, t: nowT().split(",")[0], src: "polymarket", wallet: "w1", mergeAt: Date.now() + 3500 });
        P.hold = P.hold.filter((x) => x !== h);
        P.real += q.realised;
        log("Move", `Brought ${L} from Polymarket`, `${shf(h.sh)} ${L} sold there, ${shf(q.after)} bought here`, 0);
      });
      syncPredict(); later();
    },
  };
}
/* linked wallets (Connect only): mutate() re-renders every screen */
export function addWallet(kind: "solana" | "polymarket") {
  const used = P.wallets.filter((w) => w.kind === kind).length - (kind === "solana" ? 1 : 0);
  const f = FIND[kind][used] || { name: kind === "solana" ? "Solana wallet" : "Polymarket", addr: kind === "solana" ? "Hq3vN8…2kPd" : "0x5a0e…7c13", hold: [] };
  const w: Wallet = { id: "w" + ++P.seq, kind, name: f.name, addr: f.addr };
  mutate(() => {
    P.wallets.push(w);
    f.hold.forEach((x) => P.hold.push({ id: "h" + ++P.seq, wallet: w.id, src: kind === "solana" ? "world" : "polymarket", ...x }));
    syncPredict();
  });
  return { name: w.name, n: f.hold.length };
}
export function removeWallet(id: string) {
  const w = walletOf(id);
  if (!w || w.main) return null;
  const gone = P.hold.filter((h) => h.wallet === id).length;
  mutate(() => {
    P.hold = P.hold.filter((h) => h.wallet !== id);
    P.wallets = P.wallets.filter((x) => x !== w);
    syncPredict();
  });
  return { name: w.name, gone };
}
export const sideLabel = sdName;

seedPH();
syncPredict();
