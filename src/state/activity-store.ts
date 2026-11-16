import AsyncStorage from "@react-native-async-storage/async-storage";

import { ACTIVITY, type Activity } from "@/sample/data";
import type { Chain } from "@/state/chain";
import { mutate } from "@/state/store";

// History of the wallet's own transactions. A row is kept on the phone, per wallet, as soon as the chain confirms it, so it is
// still there after the app restarts; readers of the chain (Stellar's Earn events) fill in what happened elsewhere.
const key = (chain: Chain, owner: string) => `vanna.activity.${chain}.${owner}`;
const same = (a: Activity, b: Activity) => !!a.hash && a.hash === b.hash && a.action === b.action && a.sym === b.sym;

// Stellar moved to the CreditLayer contracts on 2026-11-16 (the old AccountManager / pools are no longer used). Rows the phone saved
// before that describe the old contracts, so they are not shown.
const STELLAR_CREDIT_LAYER_FROM = new Date("2026-11-16T00:00:00+05:30").getTime();

async function saved(chain: Chain, owner: string): Promise<Activity[]> {
  try {
    const raw = await AsyncStorage.getItem(key(chain, owner));
    const rows = raw ? (JSON.parse(raw) as Activity[]) : [];
    return chain === "stellar" ? rows.filter((r) => (r.ms ?? 0) >= STELLAR_CREDIT_LAYER_FROM) : rows;
  } catch {
    return [];
  }
}

export async function rememberActivity(chain: Chain, owner: string, row: Activity) {
  const rows = [row, ...(await saved(chain, owner)).filter((r) => !same(r, row))].slice(0, 200);
  AsyncStorage.setItem(key(chain, owner), JSON.stringify(rows)).catch(() => {});
}

/** Replaces the screen's history with this wallet's: what the phone saved, plus anything the chain reader found. */
export async function loadActivity(chain: Chain, owner: string, fromChain: Activity[] = []) {
  const mine = await saved(chain, owner);
  const merged = [...mine];
  for (const r of fromChain) if (!merged.some((m) => same(m, r))) merged.push(r);
  mutate(() => {
    const keep = ACTIVITY[chain].filter((r) => !r.hash); // sample / pending rows without a chain record stay as they are
    ACTIVITY[chain].length = 0;
    ACTIVITY[chain].push(...merged, ...keep);
  });
}
