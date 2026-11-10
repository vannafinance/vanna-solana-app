import { useSyncExternalStore } from "react";

import { ACCOUNT, POINTS } from "./data";

/* Rewards and the Copilot gate (design screens/rewards.js + copilot.js GateAPI), sample account = Maya, Season 0 on testnet.
   Points are credited every Monday; the formula is not published. Leaderboard: 60 invented rows on a power-law curve anchored
   at the sample account (#312 of 18,420). */

export const SEASON = { name: "Testnet Season", tag: "Season 0" };
export const USERS = 18420, MY_RANK = 312;
export const OVERVIEW = { points: POINTS, lastDrop: 3493, week: { mods: 3, days: 3 }, byChain: { solana: 8161, stellar: 1960 } };

// Quests (design QDEF): the module's icon and colour, what to do while open, the day it was done.
export const QUESTS: { t: string; icon: "south" | "savings" | "account_balance" | "candlestick_chart" | "eco" | "how_to_vote" | "group"; color: string; todo: string; go: string; done: boolean; day: string }[] = [
  { t: "Deposit", icon: "south", color: "#703AE6", todo: "Add funds to your wallet", go: "/portfolio", done: true, day: "Oct 2" },
  { t: "Supply in Earn", icon: "savings", color: "#11838B", todo: "Lend any asset in Earn", go: "/lend", done: true, day: "Oct 3" },
  { t: "Margin position", icon: "account_balance", color: "#6F45C7", todo: "Open your margin account", go: "/margin", done: true, day: "Oct 5" },
  { t: "Spot trade", icon: "candlestick_chart", color: "#5029A3", todo: "Make one swap on margin", go: "/trade", done: true, day: "Oct 9" },
  { t: "Farm deposit", icon: "eco", color: "#E2087A", todo: "Put funds in a Farm vault", go: "/farm", done: true, day: "Oct 12" },
  { t: "Prediction", icon: "how_to_vote", color: "#B6479E", todo: "Buy Yes or No on any market", go: "/lend", done: true, day: "Oct 20" },
  { t: "Invite a friend", icon: "group", color: "#FC5457", todo: "A friend joins with your code", go: "/rewards", done: true, day: "Oct 22" },
];
export const COUNTS = ["Real use in every module", "Verified referrals"];
export const NOTHING = ["Wash trading", "Self-referrals", "Duplicate accounts", "Same-minute round trips"];
export const FORMULA = "Points are credited every Monday. They reward real, sustained use across the whole product. The formula is not published and can change between seasons.";

export const REFERRAL = {
  code: "MAYA",
  link: "test.vanna.finance/?ref=MAYA",
  by: { name: "Vatsal", x: "@vatsal_v" },
  stats: { joined: 8, verified: 7, active: 5 },
  points: 3430,
};
export type Friend = { name: string; x?: string; joined: string; st: "active" | "verified" | "invited" };
export const FRIENDS: Friend[] = [
  { name: "kai.trades", x: "kaitrades", joined: "Sep 16", st: "active" },
  { name: "Priya", joined: "Sep 18", st: "active" },
  { name: "9fQm…Lk3T", joined: "Sep 21", st: "active" },
  { name: "Steady-Jade-Osprey", joined: "Sep 24", st: "active" },
  { name: "GC4R…8WQP", joined: "Sep 29", st: "active" },
  { name: "Leo", joined: "Oct 2", st: "verified" },
  { name: "3hTz…pV9a", joined: "Oct 4", st: "verified" },
  { name: "Bq7w…m2Xe", joined: "Oct 6", st: "invited" },
];
export const TIERS = [
  { name: "Bronze", min: 0, share: 10, need: "Start" },
  { name: "Silver", min: 3, share: 12, need: "3+ friends" },
  { name: "Gold", min: 10, share: 15, need: "10+ friends" },
  { name: "Platinum", min: 25, share: 20, need: "25+ friends" },
];
export const TIPS = {
  points: FORMULA,
  codes: "Each code lets one friend skip the waitlist. You get more as your tier rises, up to 12.",
  tier: "Your share of the points your friends earn. More active friends, a bigger share.",
  refhow: "Works on Solana and Stellar. Only verified friends count. Your tier grows as friends use the product.",
};

const LB_NAMES: [string | null, string?][] = [
  ["ozymandias", "ozy_perps"], ["Hikari", "hikari_fx"], [null], ["basisbandit", "basisbandit"], ["Quiet-Amber-Lynx"], ["loopdeloop", "loopdeloop"],
  ["Tavi", "tavi_onchain"], ["quietgrid"], ["Ines", "ines_lev"], ["fundingfarmer", "fundingfarmer"], [null], ["Bold-Cobalt-Orca"],
  ["stablestan", "stablestan"], ["Amara", "amara_trades"], ["carrytrade"], ["Mellow-Teal-Ibis"], ["Juno", "juno_vol"], [null],
  ["thetaloop", "thetaloop_sol"], ["Swift-Rose-Marten"], ["lumen_xlm", "lumen_xlm"], ["saltflats"], ["Noor", "noor_defi"], ["Clever-Slate-Gecko"],
  ["Okafor", "okafor_lev"], ["halfkelly"], ["Wren"], ["perpetualpete", "perpetualpete"], [null], ["anchorfx", "anchorfx"],
  ["Sunny-Copper-Fox"], ["deltaone", "delta_one"], ["Yusuf"], ["mintcondition"], ["Corvo", "corvo_trades"], ["Patient-Indigo-Wren"],
  ["Lena", "lena_lp"], ["tidepool"], [null], ["Matteo", "matteo_margin"], ["Rapid-Ivory-Heron"], ["Ash"],
  ["convexcarl", "convexcarl"], ["Gentle-Jade-Panda"], ["stellarsam", "stellarsam"], ["nightshift"], ["Ivo"], ["basispoint", "basispoint"],
  [null], ["Kenji", "kenji_quant"], ["Witty-Saffron-Raven"], ["Odette"], ["marginmara", "marginmara"], ["ridgeline"],
  ["Nimble-Coral-Kestrel"], ["yieldyeti", "yieldyeti"], ["Petra"], ["slowburn"], ["Arlo", "arlo_fx"], ["Calm-Violet-Yak"],
];
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type LbRow = { k: number; name: string | null; x: string | null; anon: number; pts: number; pic: "x" | "id" };
export const LEADERBOARD: LbRow[] = (() => {
  const r = rng(20261007), N = LB_NAMES.length;
  return LB_NAMES.map(([name, x], i) => {
    const k = i + 1, nz = k === 1 || k === N ? 1 : 1 + (r() - 0.5) * 0.02;
    return { k, name, x: x ?? null, anon: 1000 + Math.floor(r() * 9000), pts: Math.round(POINTS * Math.pow(k / MY_RANK, -0.668) * nz), pic: x ? "x" : "id" };
  });
})();

/* ---------- Copilot gate (web V7 core COPILOT_UNLOCK): testnet only ---------- */
export const UNLOCK = { ageDays: 7, modules: 3, activeDays: 5, points: 1000, mcpDelayDays: 7, extraInvites: 2 };
export const MODULES: [string, string][] = [["earn", "Earn"], ["margin", "Margin trade"], ["spot", "Spot"], ["farm", "Farm"], ["predict", "Predict"]];
export const GATE = { age: 22, used: ["earn", "spot"], active: 7 };
export const PERKS = ["Copilot runs earn a points boost", "A Copilot tester badge", `${UNLOCK.extraInvites} more invite codes`, "A priority invite to Copilot on mainnet"];

/* ---------- small session store: the Copilot preview state and the public profile ---------- */
type St = { cpView: "locked" | "unlocked"; unlockSeen: boolean; name: string; show: boolean; renamed: string | null; code: string; codeEdited: boolean };
let st: St = { cpView: "locked", unlockSeen: false, name: ACCOUNT.name, show: true, renamed: null, code: REFERRAL.code, codeEdited: false };
const subs = new Set<() => void>();
export function setRewards(p: Partial<St>) {
  st = { ...st, ...p };
  subs.forEach((f) => f());
}
export const useRewards = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => st);
export const rewardsNow = () => st;
export const ANON = 4821;
export const RENAME_ON = "Nov 6";
const RESERVED = ["VANNA", "ADMIN", "SUPPORT", "ANONYMOUS"];
// design checkName / checkCode, word for word
export function checkName(v: string, cur: string, renamed: string | null): { ok: boolean; msg: string; bad?: boolean } {
  v = v.trim();
  if (v.length < 3) return { ok: false, msg: "3 to 20 characters" };
  if (v.length > 20) return { ok: false, msg: "20 characters at most", bad: true };
  if (v.includes("@")) return { ok: false, msg: "Pick a name, not an email", bad: true };
  if (!/^[A-Za-z0-9 _.-]+$/.test(v)) return { ok: false, msg: "Letters, numbers, spaces, dots, dashes and underscores", bad: true };
  if (v === cur) return { ok: false, msg: renamed ? `Saved. You can change it again on ${renamed}` : "Your current name" };
  if (renamed) return { ok: false, msg: `You can change it again on ${renamed}`, bad: true };
  const lv = v.toLowerCase();
  if (RESERVED.includes(v.toUpperCase()) || LEADERBOARD.some((w) => w.name?.toLowerCase() === lv) || FRIENDS.some((f) => f.name.toLowerCase() === lv)) return { ok: false, msg: "That name is taken", bad: true };
  return { ok: true, msg: "Available" };
}
export function checkCode(v: string, cur: string): { ok: boolean; msg: string; bad?: boolean } {
  if (!v) return { ok: false, msg: "3 to 16 letters, numbers, - or _" };
  if (!/^[A-Z0-9_-]+$/.test(v)) return { ok: false, msg: "Letters, numbers, - and _ only", bad: true };
  if (v.length < 3 || v.length > 16) return { ok: false, msg: "3 to 16 letters, numbers, - or _", bad: v.length > 16 };
  if (v === cur) return { ok: false, msg: "This is your code now" };
  if (RESERVED.includes(v) || FRIENDS.some((f) => f.name.toUpperCase().replace(/[^A-Z0-9]/g, "") === v.replace(/[-_]/g, ""))) return { ok: false, msg: "That code is taken", bad: true };
  return { ok: true, msg: "Available" };
}
export const copilotUnlocked = () => st.cpView === "unlocked";
