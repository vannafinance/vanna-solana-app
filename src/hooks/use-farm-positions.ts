import { useSyncExternalStore } from "react";

import { summarisePositions } from "@/lib/farm/position-math";
import { getFarmPositions, subscribeFarmPositions } from "@/lib/preview-data/farm";
import type { FarmPositionsView } from "@/types/farm";
import type { Resource } from "@/types/resource";

export function useFarmPositions(): Resource<FarmPositionsView> {
  const positions = useSyncExternalStore(subscribeFarmPositions, getFarmPositions);
  return positions.length === 0 ? { status: "empty" } : { status: "ready", data: summarisePositions(positions) };
}
