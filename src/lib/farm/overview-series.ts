import type { TokenAmount } from "@/format/format-amount";
import type { OraclePrices } from "@/lib/solana/oracle-prices";
import type {
  FarmChart,
  FarmChartPoint,
  FarmEarnings,
  FarmHistoryEntry,
  FarmHistoryKind,
  FarmOverview,
  FarmOverviewMode,
  FarmOverviewRange,
  FarmPosition,
  FarmPositionView,
  PoolSymbol,
} from "@/types/farm";

import { toPositionView } from "./position-math";
import { toUsd } from "./units";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const POINTS = 40;
const WINDOW_MS: Record<Exclude<FarmOverviewRange, "All">, number> = { "1W": 7 * DAY, "1M": 30 * DAY, "3M": 91 * DAY };

// One deploy into a farm: when it landed (ms) and what was borrowed for it, in the pool asset's units.
export type Tranche = { at: number; weight: bigint };

// An exit: when it landed, what it paid out beyond the debt it repaid, and the deploys of the farm it came out of.
type FarmExit = { at: number; pool: PoolSymbol; kept: TokenAmount; tranches: readonly Tranche[] };

// An asset going into a farm (the stock deposited, the pool asset supplied to Kamino) or coming out of one; or the stock
// going back to the wallet, which ends every farm of that stock, whatever its Kamino part still held.
type Flow = { at: number; farm: string; symbol: string; amount: TokenAmount; out: boolean } | { at: number; ends: string };

type FarmTimeline = {
  // The deploys behind each farm still open, by `${stock}-${pool}`.
  open: ReadonlyMap<string, readonly Tranche[]>;
  exits: readonly FarmExit[];
  flows: readonly Flow[];
  firstAt: number | null;
  lastAt: number | null;
};

const keyOf = (stock: string, pool: string) => `${stock}-${pool}`;
const amountOf = (entry: FarmHistoryEntry, kind: FarmHistoryKind) => entry.actions.find((action) => action.kind === kind)?.amount;

// Replays the Farm transactions that went through, oldest first, the way the history is read for positions: a deploy adds to
// its stock's farm in that pool, an exit pays out what Kamino returned beyond the debt, and returning the stock ends the farm.
function farmTimeline(entries: readonly FarmHistoryEntry[]): FarmTimeline {
  const open = new Map<string, Tranche[]>();
  const exits: FarmExit[] = [];
  const flows: Flow[] = [];
  const landed = entries.filter((entry) => entry.status === "succeeded").sort((a, b) => a.occurredAt - b.occurredAt);

  for (const entry of landed) {
    const at = entry.occurredAt;
    const key = keyOf(entry.collateralSymbol, entry.poolSymbol);
    if (entry.event === "deploy") {
      const stock = amountOf(entry, "deposit");
      // Everything borrowed is supplied to Kamino, so the borrow is what went in.
      const lent = amountOf(entry, "borrow") ?? amountOf(entry, "supply");
      open.set(key, [...(open.get(key) ?? []), { at, weight: lent?.raw ?? 0n }]);
      if (stock) flows.push({ at, farm: key, symbol: entry.collateralSymbol, amount: stock, out: false });
      if (lent) flows.push({ at, farm: key, symbol: entry.poolSymbol, amount: lent, out: false });
    } else if (entry.event === "exit") {
      const redeemed = amountOf(entry, "redeem");
      const repaid = amountOf(entry, "repay");
      if (!redeemed || !repaid) continue;
      const kept = redeemed.raw > repaid.raw ? redeemed.raw - repaid.raw : 0n;
      exits.push({ at, pool: entry.poolSymbol, kept: { raw: kept, decimals: redeemed.decimals }, tranches: open.get(key) ?? [] });
      flows.push({ at, farm: key, symbol: entry.poolSymbol, amount: redeemed, out: true });
    } else {
      for (const farm of [...open.keys()]) if (farm.startsWith(`${entry.collateralSymbol}-`)) open.delete(farm);
      flows.push({ at, ends: entry.collateralSymbol });
    }
  }

  return { open, exits, flows, firstAt: landed[0]?.occurredAt ?? null, lastAt: landed[landed.length - 1]?.occurredAt ?? null };
}

// How much of what a farm had earned by `end` it had already earned at `at`, if each deploy earned at one steady rate from
// when it landed: linear per deploy, weighted by what it borrowed. 0 before the first deploy, 1 from `end` on. With no deploy
// known it is a step at `end`.
export function accruedShare(tranches: readonly Tranche[], at: number, end: number): number {
  if (at >= end) return 1;
  const landed = tranches.filter((tranche) => tranche.at < end);
  const weighed = landed.some((tranche) => tranche.weight > 0n) ? landed : landed.map((tranche) => ({ ...tranche, weight: 1n }));
  let total = 0;
  let done = 0;
  for (const tranche of weighed) {
    const weight = Number(tranche.weight);
    total += weight * (end - tranche.at);
    done += weight * Math.max(0, at - tranche.at);
  }
  return total > 0 ? done / total : 0;
}

const share = (usd: bigint, part: number) => (part >= 1 ? usd : BigInt(Math.round(Number(usd) * part)));

function weightedBps(views: readonly FarmPositionView[], rate: (view: FarmPositionView) => number, weight: (view: FarmPositionView) => bigint): number | null {
  const total = views.reduce((sum, view) => sum + weight(view), 0n);
  return total > 0n ? Number(views.reduce((sum, view) => sum + BigInt(rate(view)) * weight(view), 0n) / total) : null;
}

// Net earnings = what Kamino paid on the open positions' supply - the borrow interest their loans have accrued + what exits
// already paid out beyond the debt they repaid. The exits are priced at today's price of the pool asset, as on History.
function earningsOf(views: readonly FarmPositionView[], exits: readonly FarmExit[], prices: OraclePrices): FarmEarnings {
  const kaminoUsd = views.reduce((sum, view) => sum + view.earningsUsd, 0n);
  const interestUsd = views.reduce((sum, view) => sum + view.interestValueUsd, 0n);
  const closedUsd = exits.reduce((sum, exit) => sum + exitUsd(exit, prices), 0n);
  return {
    netUsd: kaminoUsd - interestUsd + closedUsd,
    kaminoUsd,
    interestUsd,
    closedUsd,
    borrowApyBps: weightedBps(views, (view) => view.borrowApyBps, (view) => view.debtValueUsd),
    supplyApyBps: weightedBps(views, (view) => view.supplyApyBps, (view) => view.suppliedValueUsd),
  };
}

function exitUsd(exit: FarmExit, prices: OraclePrices): bigint {
  const price = prices[exit.pool];
  return price === undefined ? 0n : toUsd(exit.kept, price);
}

export type FarmOverviewInput = {
  positions: readonly FarmPosition[];
  entries: readonly FarmHistoryEntry[];
  prices: OraclePrices;
  mode: FarmOverviewMode;
  range: FarmOverviewRange;
  // When the positions were read: the last point, which holds today's real figure.
  now: number;
};

type ChartInput = FarmOverviewInput & { timeline: FarmTimeline; views: readonly FarmPositionView[]; earnings: FarmEarnings };

// Net earnings over time: each open position goes from zero at its deploys to what it has earned today, and each exit from
// zero to what it paid out, then stays there. Only today's figure and the exits are known; the line between is an estimate
// at a steady rate. Deployed is the stock plus what is in Kamino, from the deploys and exits, at today's prices (the history
// has no past prices), ending at today's value.
function chartOf({ positions, prices, mode, range, now: readAt, timeline, views, earnings }: ChartInput): FarmChart {
  const now = Math.max(readAt, timeline.lastAt ?? readAt);
  const farms = positions.map((position, index) => ({
    usd: views[index].earningsUsd - views[index].interestValueUsd,
    tranches: timeline.open.get(keyOf(position.collateralSymbol, position.poolSymbol)) ?? [{ at: position.openedAt * 1000, weight: 1n }],
  }));
  const exits = timeline.exits.map((exit) => ({ at: exit.at, usd: exitUsd(exit, prices), tranches: exit.tranches }));

  const earningsAt = (at: number) =>
    farms.reduce((sum, farm) => sum + share(farm.usd, accruedShare(farm.tranches, at, now)), 0n) +
    exits.reduce((sum, exit) => sum + share(exit.usd, accruedShare(exit.tranches, at, exit.at)), 0n);

  // What each farm held at `at`, by farm and asset, valued at today's prices.
  const deployedAt = (at: number) => {
    const held = new Map<string, { symbol: string; amount: TokenAmount }>();
    for (const flow of timeline.flows) {
      if (flow.at > at) break;
      if ("ends" in flow) {
        for (const slot of [...held.keys()]) if (slot.startsWith(`${flow.ends}-`)) held.delete(slot);
        continue;
      }
      const slot = `${flow.farm}:${flow.symbol}`;
      const before = held.get(slot)?.amount.raw ?? 0n;
      const after = flow.out ? before - flow.amount.raw : before + flow.amount.raw;
      held.set(slot, { symbol: flow.symbol, amount: { raw: after > 0n ? after : 0n, decimals: flow.amount.decimals } });
    }
    let total = 0n;
    for (const { symbol, amount } of held.values()) {
      const price = prices[symbol as keyof OraclePrices];
      if (price !== undefined) total += toUsd(amount, price);
    }
    return total;
  };

  const value = mode === "earnings" ? earnings.netUsd : views.reduce((sum, view) => sum + view.collateralValueUsd + view.suppliedValueUsd, 0n);
  const valueAt = mode === "earnings" ? earningsAt : deployedAt;
  const first = Math.min(timeline.firstAt ?? now, ...positions.map((position) => position.openedAt * 1000));
  const span = range === "All" ? Math.max(now - first + 2 * DAY, 7 * DAY) : WINDOW_MS[range];
  const stepMs = Math.max(Math.floor(span / POINTS), HOUR);

  const points: FarmChartPoint[] = [];
  for (let at = now - span; at < now; at += stepMs) points.push({ at, usd: valueAt(at) });
  points.push({ at: now, usd: value });
  return { value, points, stepMs, now };
}

// The Positions chart and the figures under it. Null when there is nothing to chart: no position open and no Farm
// transaction that went through.
export function farmOverview(input: FarmOverviewInput): FarmOverview | null {
  if (input.positions.length === 0 && !input.entries.some((entry) => entry.status === "succeeded")) return null;
  const timeline = farmTimeline(input.entries);
  const views = input.positions.map(toPositionView);
  const earnings = earningsOf(views, timeline.exits, input.prices);
  return { earnings, chart: chartOf({ ...input, timeline, views, earnings }) };
}
