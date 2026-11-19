import type { AssetConfigState, OracleConfigState } from "./actions";
import { assetConfigPda, TOKENS } from "./actions";

// Per-token risk settings read from the Vanna program's AssetConfig accounts and the oracle agent's price book (filled by
// chain/live.ts from readAllAssetConfigs). Empty until the first read succeeds: screens show "—" for a token missing here.
export type AssetRisk = {
  sym: string;
  assetConfig: string;
  collateral: boolean;
  borrow: boolean;
  ltv: number; // %
  liqThreshold: number; // %
  liqBonus: number; // %
  oracle: string; // e.g. "Kamino Scope, Pyth fallback"
  maxAgeSecs: number;
  priceFeed: string | null; // the account the price is read from (Pyth feed, else the Scope prices account)
};

export const ASSET_RISK: Record<string, AssetRisk> = {};

const UNSET = "11111111111111111111111111111111";
const set = (k: string) => !!k && k !== UNSET;

// How the oracle prices a token (web oracle.ts): Scope chain first, Pyth (optionally times a factor feed) as fallback,
// or a Kamino receipt's reserve.
export function oracleLabel(o: OracleConfigState): string {
  const scope = o.scopeChain.some((e) => e !== 65535) && set(o.scopePrices);
  const pyth = set(o.pythPrice);
  if (set(o.klendReserve)) return "Kamino receipt";
  if (scope && pyth) return "Kamino Scope, Pyth fallback";
  if (scope) return "Kamino Scope";
  if (pyth) return "Pyth";
  return "—";
}

/** Risk settings by token symbol for the app's token list (TOKENS order), from an asset-config map. */
export function riskFrom(assets: Map<number, AssetConfigState>): Record<string, AssetRisk> {
  const out: Record<string, AssetRisk> = {};
  const byMint = new Map([...assets.values()].map((a) => [a.mint, a]));
  for (const t of TOKENS) {
    const a = byMint.get(t.mint);
    if (!a || a.kind !== "token") continue;
    out[t.symbol] = {
      sym: t.symbol,
      assetConfig: a.address || assetConfigPda(t.mint),
      collateral: a.collateralEnabled,
      borrow: a.borrowEnabled,
      ltv: a.ltvBps / 100,
      liqThreshold: a.liquidationThresholdBps / 100,
      liqBonus: a.liquidationBonusBps / 100,
      oracle: oracleLabel(a.oracle),
      maxAgeSecs: a.maxPriceAgeSecs,
      priceFeed: set(a.oracle.pythPrice) ? a.oracle.pythPrice : set(a.oracle.scopePrices) ? a.oracle.scopePrices : null,
    };
  }
  return out;
}

// Health weights (program risk_engine::line_weight): a token counts at min(setting x 1.1, 100%) of its USD value. The liquidation line
// uses the asset's liquidation threshold, the borrow line (borrow / withdraw / trades need it above 1.10) its LTV. Both come from the
// AssetConfig accounts (ASSET_RISK); until they are read, the fork's configs below [ltv bps, liquidation threshold bps].
const BPS_FALLBACK: Record<string, [number, number]> = {
  SOL: [7000, 8000], JitoSOL: [7000, 8000], JupSOL: [7000, 8000], USDC: [8000, 8500], USDT: [8000, 8500], JupUSD: [8000, 8500],
  NVDAx: [5500, 6500], GOOGLx: [5500, 6500], AAPLx: [5500, 6500], TSLAx: [5500, 6500], SKR: [4000, 5500],
  // Phoenix's phUSD (not in the token list, so always from here): asset config on the fork, read 2026-11-18.
  phUSD: [8000, 8500],
};
export const lineBps = (bps: number) => Math.min(10000, Math.floor((bps * 11) / 10)) / 10000;
export function lineWeight(sym: string, line: "liq" | "borrow"): number {
  const r = ASSET_RISK[sym];
  const [ltv, lt] = r ? [Math.round(r.ltv * 100), Math.round(r.liqThreshold * 100)] : (BPS_FALLBACK[sym] ?? [5000, 6000]);
  return lineBps(line === "liq" ? lt : ltv);
}
