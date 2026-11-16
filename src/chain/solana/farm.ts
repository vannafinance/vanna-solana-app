// Solana Farm figures from the same public sources the web app's server routes use (apps/solana/app/api/solana/farm/*):
// - Kamino main-market reserves: api.kamino.finance reserves/metrics (supply APY, total supply / borrow in USD).
// - Perena USD* and USD* Junior: api.perena.org (7-day APY, share price).
const KAMINO = "https://api.kamino.finance/kamino-market/7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF/reserves/metrics?env=mainnet-beta";
const PERENA = "https://api.perena.org/api";
export const KAMINO_RESERVES = {
  SOL: "d4A2prbA2whesmvHaL88BH6Ewn5N4bTSU2Ze8P6Bc4Q",
  USDC: "D6q6wuQSrifJKZYpR1M8R4YawnLDtDsMmWM1NbBmgJ59",
  USDT: "H3t6qZ1JkguCNTi9uzVKqQ7dvt2cum4XiXWom6Gn5e5S",
} as const;

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
