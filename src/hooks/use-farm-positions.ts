import { summarisePositions } from "@/lib/farm/position-math";
import type { FarmPositionsView } from "@/types/farm";
import type { Resource } from "@/types/resource";

import { useFarmState } from "./use-farm-state";

export function useFarmPositions(): Resource<FarmPositionsView> {
  const state = useFarmState();
  if (state.status !== "ready") return state;
  return state.data.positions.length === 0 ? { status: "empty" } : { ...state, data: summarisePositions(state.data.positions) };
}
