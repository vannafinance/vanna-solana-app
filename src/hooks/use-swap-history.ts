import { useMemo } from "react";

import { previewSwapHistory } from "@/lib/preview-data/swap";
import { groupHistoryByDay } from "@/lib/swap/group-history";
import { previewResource } from "./preview-resource";
import type { Resource } from "@/types/resource";
import type { SwapHistory } from "@/types/swap";

export function useSwapHistory(): Resource<SwapHistory> {
  return useMemo(
    () =>
      previewResource({
        volumeUsd: previewSwapHistory.reduce((sum, entry) => sum + entry.valueUsd, 0n),
        groups: groupHistoryByDay(previewSwapHistory),
      }),
    [],
  );
}
