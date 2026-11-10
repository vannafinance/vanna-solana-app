import { type Href, router } from "expo-router";

/* Opens the market screen (src/app/(tabs)/lend/market/[id].tsx). m = outcome key, side = yes | no, act = sell to land on the Sell tab. */
export function openMarket(id: string, p: { m?: string; side?: string; act?: string } = {}) {
  const q = Object.entries(p).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  router.push(`/lend/market/${id}${q ? "?" + q : ""}` as Href);
}
