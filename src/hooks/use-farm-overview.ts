import { useState } from "react";

import { farmOverview } from "@/lib/farm/overview-series";
import type { FarmOverview, FarmOverviewMode, FarmOverviewRange } from "@/types/farm";
import type { Resource } from "@/types/resource";

import { useFarmState } from "./use-farm-state";

// Net earnings (or what is deployed) over time, and the earnings figures under it, for the chart on the Positions page.
// Empty when there is no position and no Farm history.
export function useFarmOverview() {
  const [mode, setMode] = useState<FarmOverviewMode>("earnings");
  const [range, setRange] = useState<FarmOverviewRange>("All");
  const state = useFarmState();

  const overview: Resource<FarmOverview> = (() => {
    if (state.status !== "ready") return state;
    const { positions, derived, prices, updatedAt } = state.data;
    const data = farmOverview({ positions, entries: derived.entries, prices, mode, range, now: updatedAt });
    return data === null ? { status: "empty" } : { ...state, data };
  })();

  return { overview, mode, setMode, range, setRange };
}
