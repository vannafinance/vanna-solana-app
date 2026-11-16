/* Farm vault detail model (design SCREENS['farm-vault'] / ['farm-position'], screens/farm.js): the per-kind constants and the sample
   series of the V7 design, ending on the live figures where the app has them. The web serves these histories from its own NAV records
   or the fork, so the chart shapes are the design's deterministic sample series. */

export const N = 120, DAY = 864e5, TODAY = Date.UTC(2026, 9, 7);
export const dayMs = (i: number) => TODAY - (N - 1 - i) * DAY;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dLbl = (ms: number) => {
  const d = new Date(ms);
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
};
export const sinceIdx = (s: string) => {
  const d = Date.parse(s + " 2026 UTC");
  return isFinite(d) ? Math.max(0, Math.min(N - 1, N - 1 - Math.round((TODAY - d) / DAY))) : N - 1;
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  let u = 0, v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);

/* ---------- per-kind constants (design KAM / VAULTS / PER) ---------- */
export const KAM_X: Record<string, { depU: number; borU: number; borA: number; util: number; dep: number; rc: string }> = {
  "kamino-sol": { depU: 270052719.73, borU: 244350557.4, borA: 5.4, util: 90.48, dep: 2.32e6, rc: "kSOL" },
  "kamino-usdc": { depU: 122289228.91, borU: 111496333.85, borA: 5.96, util: 91.17, dep: 122.31e6, rc: "kUSDC" },
  "kamino-usdt": { depU: 11105247.27, borU: 9772257.64, borA: 5.76, util: 88.0, dep: 11.11e6, rc: "kUSDT" },
};
export const PER_X: Record<string, { rc: string; tvl: number; sp: number; spP: number; apy7: number; holders: number; rec30: number; roi: number; mdd: number; who: string }> = {
  usdstar: { rc: "USD*", tvl: 11472093.92, sp: 1.101795, spP: 1.101916, apy7: 9.46, holders: 8568, rec30: 9.21, roi: 1.84, mdd: 0.002, who: "For most depositors" },
  junior: { rc: "USD* Junior", tvl: 1520887.48, sp: 1.089171, spP: 1.08924, apy7: 14.18, holders: 388, rec30: 13.6, roi: 2.71, mdd: 0.011, who: "Takes first loss on USD* for a higher yield" },
};

/* ---------- lending / receipts series (design kamRates, perSeries) ---------- */
export function kamRates(dep: number, sup0: number, borA: number) {
  const r = rng((Math.round(dep) % 997) + 3), sup: number[] = [];
  let x = sup0;
  for (let i = 0; i < N; i++) {
    x = sup0 + 0.8 * (x - sup0) + gauss(r) * 0.22;
    sup.push(Math.max(0.5, x));
  }
  const sh = sup0 - sup[N - 1];
  for (let i = 0; i < N; i++) sup[i] += sh;
  return { sup, bor: sup.map((s, i) => (s * borA) / (sup0 || 1) + Math.sin(i / 9) * 0.05), avg30: avg(sup.slice(N - 30)) };
}
export function perSeries(sp: number, apy7: number, holders: number) {
  const d: number[] = [], r = rng(holders);
  let v = sp;
  for (let i = N - 1; i >= 0; i--) {
    d.unshift(v);
    v = (v / (1 + apy7 / 36500)) * (1 + gauss(r) * 0.00004);
  }
  return d;
}
/* ---------- "your position" series: principal + yield so far ---------- */
export function posSeries(since: string, amt: number, earned: number, price: number) {
  const i0 = sinceIdx(since), val: number[] = [], earn: number[] = [];
  for (let i = i0; i < N; i++) {
    const e = (earned * (i - i0)) / Math.max(1, N - 1 - i0);
    val.push((amt + e) * price);
    earn.push(e * price);
  }
  return { val, earn, first: i0 };
}

/* Chart axis helper (design niceStep). */
export function niceStep(span: number) {
  const raw = span / 4 || 1, p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}
