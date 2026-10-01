// Stand-in for the indexer's history endpoints: the preview account supplied 2,500 USDC on 3 Sep and 1.50 SOL on 20 Sep.
import { VANNA_RATE_MODEL, lenderRate } from "@/lib/earn/rate-model";
import type { ApyHistory, ApyPoint, ApyRange, EarnOverview, OverviewMode, OverviewRange, UsdPoint } from "@/types/earn";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const USD_SCALE = 1_000_000;

export const PREVIEW_NOW = Date.UTC(2026, 9, 1, 15, 0);

const USDC_SUPPLIED_AT = Date.UTC(2026, 8, 3, 10);
const SOL_SUPPLIED_AT = Date.UTC(2026, 8, 20, 14);
const USDC_EARNED_USD = 0.81;
const SOL_EARNED_USD = 0.56;
const USDC_SUPPLIED_USD = 2500;
const SOL_SUPPLIED_USD = 176.5;
const SOL_PRICE_SWING_USD = 6;

const OVERVIEW_WINDOWS: Record<OverviewRange, { spanMs: number; stepMs: number }> = {
  "1W": { spanMs: 7 * DAY, stepMs: 3 * HOUR },
  "1M": { spanMs: 30 * DAY, stepMs: 12 * HOUR },
  "3M": { spanMs: 91 * DAY, stepMs: DAY },
  All: { spanMs: PREVIEW_NOW - USDC_SUPPLIED_AT + 2 * DAY, stepMs: 12 * HOUR },
};

const APY_WINDOWS: Record<ApyRange, { spanMs: number; stepMs: number }> = {
  "7D": { spanMs: 7 * DAY, stepMs: 3 * HOUR },
  "30D": { spanMs: 30 * DAY, stepMs: 12 * HOUR },
  "90D": { spanMs: 90 * DAY, stepMs: DAY },
};

function earnedUsd(at: number): number {
  const accrued = (since: number, total: number) => (at > since ? ((Math.min(at, PREVIEW_NOW) - since) / (PREVIEW_NOW - since)) * total : 0);
  return accrued(USDC_SUPPLIED_AT, USDC_EARNED_USD) + accrued(SOL_SUPPLIED_AT, SOL_EARNED_USD);
}

function solPriceSwing(index: number): number {
  const x = Math.sin(index * 12.9898 + 3 * 78.233) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * SOL_PRICE_SWING_USD;
}

function depositUsd(at: number, index: number): number {
  const usdc = at >= USDC_SUPPLIED_AT ? USDC_SUPPLIED_USD : 0;
  const sol = at >= SOL_SUPPLIED_AT ? SOL_SUPPLIED_USD + (at >= PREVIEW_NOW - HOUR ? 0 : solPriceSwing(index)) : 0;
  return usdc + sol + earnedUsd(at);
}

function toMicros(usd: number): bigint {
  return BigInt(Math.round(usd * USD_SCALE));
}

export function previewOverviewSeries(mode: OverviewMode, range: OverviewRange): Pick<EarnOverview, "points" | "stepMs" | "now"> {
  const { spanMs, stepMs } = OVERVIEW_WINDOWS[range];
  const valueAt = mode === "earnings" ? (at: number) => earnedUsd(at) : depositUsd;
  const points: UsdPoint[] = [];
  let index = 0;
  for (let at = PREVIEW_NOW - spanMs; at < PREVIEW_NOW; at += stepMs, index++) points.push({ at, usd: toMicros(valueAt(at, index)) });
  points.push({ at: PREVIEW_NOW, usd: toMicros(valueAt(PREVIEW_NOW, index)) });
  return { points, stepMs, now: PREVIEW_NOW };
}

export function previewApyHistory(utilization: number, range: ApyRange): ApyHistory {
  const { spanMs, stepMs } = APY_WINDOWS[range];
  const apyAt = (u: number) => lenderRate(VANNA_RATE_MODEL, u) * 100;
  const points: ApyPoint[] = [];
  for (let at = PREVIEW_NOW - spanMs; at < PREVIEW_NOW; at += stepMs) {
    const ageDays = (PREVIEW_NOW - at) / DAY;
    const drift = Math.sin(ageDays / 2.3) * 0.06 + Math.sin(ageDays / 0.9 + 1) * 0.02;
    const u = Math.max(0.005, utilization * (1 - ageDays * 0.004) + utilization * drift * Math.min(1, ageDays / 2));
    points.push({ at, apyPercent: apyAt(u) });
  }
  points.push({ at: PREVIEW_NOW, apyPercent: apyAt(utilization) });
  return { stepMs, points };
}
