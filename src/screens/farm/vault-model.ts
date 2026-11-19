/* Farm vault detail model (design SCREENS['farm-vault'] / ['farm-position'], screens/farm.js): dates, receipt names and the chart
   axis helper. The web draws history from its own server records; the app has no such source, so it draws no history charts. */

export const N = 120, DAY = 864e5, TODAY = Date.UTC(2026, 9, 7);
export const dayMs = (i: number) => TODAY - (N - 1 - i) * DAY;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const dLbl = (ms: number) => {
  const d = new Date(ms);
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

/* ---------- per-kind constants: receipt names and copy only. Every figure (APY, totals, share price, TVL, holders) is live
   (chain/live.ts); the app has no source for history, so no history series are drawn. ---------- */
export const KAM_X: Record<string, { rc: string }> = {
  "kamino-sol": { rc: "kSOL" },
  "kamino-usdc": { rc: "kUSDC" },
  "kamino-usdt": { rc: "kUSDT" },
};
export const PER_X: Record<string, { rc: string; who: string; exitFee: string }> = {
  usdstar: { rc: "USD*", who: "For most depositors", exitFee: "None" },
  // Perena charges 1% to leave the junior tranche (web lib/solana/vault-state.ts exitFeeBps).
  junior: { rc: "USD* Junior", who: "Takes first loss on USD* for a higher yield", exitFee: "1%" },
};

/* Chart axis helper (design niceStep). */
export function niceStep(span: number) {
  const raw = span / 4 || 1, p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}
