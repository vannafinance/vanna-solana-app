import { useState } from "react";

import { useEarnDeposits } from "@/hooks/use-earn-deposits";
import { useEarnEvents } from "@/hooks/use-earn-events";
import { useOraclePrices } from "@/hooks/use-oracle-prices";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { buildOverviewSeries } from "@/lib/earn/overview-series";
import type { EarnOverview, EarnPortfolio, OverviewMode, OverviewRange } from "@/types/earn";
import type { Resource } from "@/types/resource";

// The deposit value (or net earnings) over time, for the chart on the Positions page.
export function useEarnOverview(portfolio: Resource<EarnPortfolio>) {
  const [mode, setMode] = useState<OverviewMode>("deposit");
  const [range, setRange] = useState<OverviewRange>("3M");
  const wallet = useWalletAddress();
  const prices = useOraclePrices();
  const deposits = useEarnDeposits(wallet);
  const events = useEarnEvents(wallet);

  const overview: Resource<EarnOverview> = (() => {
    if (portfolio.status !== "ready") return portfolio;
    if (prices.data === undefined) return prices.isError ? { status: "empty" } : { status: "loading" };
    const value = mode === "deposit" ? portfolio.data.summary.suppliedUsd : portfolio.data.earnedUsd;
    if (value === null) return { status: "empty" };
    const current = new Map((deposits.data ?? []).map((deposit) => [deposit.symbol, deposit.supplied]));
    return { status: "ready", data: { value, ...buildOverviewSeries(events.data ?? [], prices.data, current, mode, range, deposits.dataUpdatedAt, value) } };
  })();

  return { overview, mode, setMode, range, setRange };
}
