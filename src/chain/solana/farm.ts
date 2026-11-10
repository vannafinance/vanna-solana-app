// Solana Farm figures from the same public sources the web app's server routes use (apps/solana/app/api/solana/farm/*):
// - Kamino main-market reserves: api.kamino.finance reserves/metrics (supply APY, total supply / borrow in USD).
// - Perena USD* and USD* Junior: api.perena.org (7-day APY, share price).
// - Basis vaults "Funding now": Phoenix's latest published hourly funding x 8760 (lib/farm/basis-live.ts fundingNowApr).
const KAMINO = "https://api.kamino.finance/kamino-market/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF/reserves/metrics?env=mainnet-beta";
const PERENA = "https://api.perena.org/api";
const PHOENIX = "https://perp-api.phoenix.trade";
export const KAMINO_RESERVES = {
  SOL: "d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q",
  USDC: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  USDT: "H3t6qZ1JkguCNTi9uzVKqQ7dvt2cum4XiXWom6Gn5e5S",
} as const;
const HOURS_PER_YEAR = 24 * 365;

const getJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 12_000);
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal });
    if (!r.ok) throw new Error(`${url} ${r.status}`);
    return (await r.json()) as T;
  } finally {
    clearTimeout(t);
  }
};
const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export type KaminoReserve = { supplyApy: number; supplyUsd: number; util: number; borrowApy: number | null; borrowUsd: number };
export async function fetchKamino(): Promise<Partial<Record<keyof typeof KAMINO_RESERVES, KaminoReserve>>> {
  const rows = await getJson<{ reserve: string; supplyApy: string; borrowApy?: string; totalSupplyUsd: string; totalBorrowUsd: string }[]>(KAMINO);
  const out: Partial<Record<keyof typeof KAMINO_RESERVES, KaminoReserve>> = {};
  for (const [sym, id] of Object.entries(KAMINO_RESERVES) as [keyof typeof KAMINO_RESERVES, string][]) {
    const m = rows.find((r) => r.reserve === id);
    const apy = num(m?.supplyApy), s = num(m?.totalSupplyUsd), b = num(m?.totalBorrowUsd);
    if (apy === null || s === null || b === null) continue;
    const ba = num(m?.borrowApy);
    out[sym] = { supplyApy: apy * 100, supplyUsd: s, util: s > 0 ? (b / s) * 100 : 0, borrowApy: ba === null ? null : ba * 100, borrowUsd: b };
  }
  return out;
}

export type PerenaProduct = { apy7: number | null; price: number | null };
export async function fetchPerena(): Promise<Record<"usdstar" | "junior", PerenaProduct>> {
  const get = (p: string) => getJson<Record<string, unknown>>(`${PERENA}/${p}`, { headers: { Origin: "https://app.perena.org" } }).catch(() => null);
  const one = async (k: string) => {
    const [a, p] = await Promise.all([get(`${k}/apy`), get(`${k}/price`)]);
    return { apy7: num(a?.apy), price: num(p?.price) };
  };
  const [usdstar, junior] = await Promise.all([one("usdstar"), one("usdstarJunior")]);
  return { usdstar, junior };
}

// Annualised funding now (%), per Phoenix market symbol.
export async function fetchFundingNow(symbols: string[]): Promise<Record<string, number>> {
  const start = Date.now() - 6 * 3_600_000;
  const out: Record<string, number> = {};
  await Promise.all(
    symbols.map(async (s) => {
      const body = await getJson<{ rates?: { timestamp: number; fundingRatePercentage: string }[] }>(`${PHOENIX}/v1/funding/${s}/rates?startTime=${start}&limit=100`).catch(() => null);
      const rates = (body?.rates ?? []).filter((r) => Number.isFinite(Number(r.fundingRatePercentage))).sort((a, b) => a.timestamp - b.timestamp);
      const last = rates.at(-1);
      if (last) out[s] = Number(last.fundingRatePercentage) * HOURS_PER_YEAR;
    }),
  );
  return out;
}

// Phoenix's published hourly funding for a market over the last `days` days, averaged per UTC day and annualised (%), oldest first
// (the web app's /api/solana/farm/funding route: public, no key). Dates are the UTC day starts in ms.
export async function fetchFundingDays(symbol: string, days = 90): Promise<{ dates: number[]; vals: number[] }> {
  const start = Date.now() - days * 86_400_000;
  const body = await getJson<{ rates?: { timestamp: number | string; fundingRatePercentage: string }[] }>(`${PHOENIX}/v1/funding/${symbol}/rates?startTime=${start}&limit=10000`);
  const byDay = new Map<number, number[]>();
  for (const r of body.rates ?? []) {
    const t = typeof r.timestamp === "number" ? r.timestamp : Date.parse(r.timestamp) / 1000;
    const ms = t < 1e12 ? t * 1000 : t, p = Number(r.fundingRatePercentage);
    if (!Number.isFinite(ms) || !Number.isFinite(p)) continue;
    const day = Math.floor(ms / 86_400_000) * 86_400_000;
    byDay.set(day, [...(byDay.get(day) ?? []), p]);
  }
  const dates = [...byDay.keys()].sort((a, b) => a - b);
  return { dates, vals: dates.map((d) => (byDay.get(d)!.reduce((s, x) => s + x, 0) / byDay.get(d)!.length) * HOURS_PER_YEAR) };
}
