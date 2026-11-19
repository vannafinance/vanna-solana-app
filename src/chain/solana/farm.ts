// Solana Farm figures from the same public sources the web app's server routes use (apps/solana/app/api/solana/farm/*):
// - Kamino main-market reserves: api.kamino.finance reserves/metrics (supply APY, total supply / borrow in USD).
// - Perena USD* and USD* Junior: api.perena.org (7-day APY, holders, mainnet share price), and on the fork their on-chain
//   share price and share supply (TVL = supply x share price), as the web's farm/vaults route does (lib/solana/vault-state.ts).
import { Buffer } from "buffer";

import { rpc } from "./rpc";
import { PERENA_VAULTS } from "./tokens";

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

export type PerenaProduct = { apy7: number | null; price: number | null; holders: number | null };
export async function fetchPerena(): Promise<Record<"usdstar" | "junior", PerenaProduct>> {
  const get = (p: string) => getJson<Record<string, unknown>>(`${PERENA}/${p}`, { headers: { Origin: "https://app.perena.org" } }).catch(() => null);
  const one = async (k: string) => {
    const [a, p, h] = await Promise.all([get(`${k}/apy`), get(`${k}/price`), get(`${k}/holders`)]);
    return { apy7: num(a?.apy), price: num(p?.price), holders: num(h?.holders) };
  };
  const [usdstar, junior] = await Promise.all([one("usdstar"), one("usdstarJunior")]);
  if ([usdstar, junior].every((x) => x.apy7 === null && x.price === null && x.holders === null)) throw new Error("Perena API unavailable");
  return { usdstar, junior };
}

// The fork's own Perena NAV: share price (u64 at the vault's price offset, 6 decimals) and the share mint's supply.
const PERENA_PROGRAM = "save8RQVPMWNTzU18t3GBvBkN9hT7jsGjiCQ28FpD9H";
export type PerenaFork = { sharePrice: number; tvlUsd: number };
export async function fetchPerenaFork(): Promise<Partial<Record<string, PerenaFork>>> {
  const keys = PERENA_VAULTS.flatMap((v) => [v.account, v.mint]);
  const res = await rpc<{ value: ({ data: [string, string]; owner: string } | null)[] }>("getMultipleAccounts", [keys, { encoding: "base64" }]);
  const out: Partial<Record<string, PerenaFork>> = {};
  PERENA_VAULTS.forEach((v, i) => {
    const src = res.value[i * 2], mint = res.value[i * 2 + 1];
    if (!src || src.owner !== PERENA_PROGRAM || !mint) return;
    const d = Buffer.from(src.data[0], "base64"), m = Buffer.from(mint.data[0], "base64");
    if (d.length < v.priceOffset + 8 || m.length < 44) return;
    const price = d.readBigUInt64LE(v.priceOffset);
    out[v.id] = { sharePrice: Number(price) / 1e6, tvlUsd: Number((m.readBigUInt64LE(36) * price) / 1_000_000n) / 1e6 };
  });
  return out;
}
