import { toPositionView } from "@/lib/farm/position-math";
import type { FarmPositionView } from "@/types/farm";
import type { Resource } from "@/types/resource";

import { useFarmState } from "./use-farm-state";

export function useFarmPosition(id: string): Resource<FarmPositionView> {
  const state = useFarmState();
  if (state.status !== "ready") return state;
  const position = state.data.positions.find((candidate) => candidate.id === id);
  return position ? { ...state, data: toPositionView(position) } : { status: "empty" };
}
