import { useState } from "react";

import { previewVaultCategories, previewVaults } from "@/lib/preview-data/earn";
import { previewOverviewSeries } from "@/lib/preview-data/earn-series";
import type { EarnOverview, OverviewMode, OverviewRange, PoolFilterOption, VaultSummary } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";
import { useEarnPositions } from "./use-earn-positions";

export function useEarnVaults() {
  const [mode, setMode] = useState<OverviewMode>("deposit");
  const [range, setRange] = useState<OverviewRange>("3M");
  const [filter, setFilter] = useState<PoolFilterOption["value"]>("all");
  const portfolio = useEarnPositions();

  const overview: Resource<EarnOverview> = (() => {
    if (portfolio.status !== "ready") return portfolio;
    const value = mode === "deposit" ? portfolio.data.summary.suppliedUsd : portfolio.data.earnedUsd;
    return previewResource({ value, ...previewOverviewSeries(mode, range) });
  })();

  const summaries: VaultSummary[] = previewVaults.map(
    ({ id, symbol, category, supplyApyBps, suppliedUsd, borrowedUsd, yourSupply }) => ({ id, symbol, category, supplyApyBps, suppliedUsd, borrowedUsd, yourSupply }),
  );
  const filtered = summaries.filter((vault) => filter === "all" || vault.category === filter).sort((a, b) => b.supplyApyBps - a.supplyApyBps);
  const vaults: Resource<readonly VaultSummary[]> = filtered.length === 0 ? { status: "empty" } : previewResource(filtered);

  const filterOptions: PoolFilterOption[] = [
    { value: "all", count: summaries.length },
    ...previewVaultCategories.map((category) => ({ value: category, count: summaries.filter((vault) => vault.category === category).length })),
  ];

  return { overview, mode, setMode, range, setRange, filter, setFilter, filterOptions, vaults };
}
