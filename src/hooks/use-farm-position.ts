import { useSyncExternalStore } from "react";

import { toPositionView } from "@/lib/farm/position-math";
import { getFarmPositions, subscribeFarmPositions } from "@/lib/preview-data/farm";
import type { FarmPositionView } from "@/types/farm";
import type { Resource } from "@/types/resource";

export function useFarmPosition(id: string): Resource<FarmPositionView> {
  const positions = useSyncExternalStore(subscribeFarmPositions, getFarmPositions);
  const position = positions.find((candidate) => candidate.id === id);
  return position ? { status: "ready", data: toPositionView(position) } : { status: "empty" };
}
