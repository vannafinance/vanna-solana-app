import { previewHistory } from "@/lib/preview-data/earn";
import type { EarnHistoryGroup } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";

export function useEarnHistory(): Resource<readonly EarnHistoryGroup[]> {
  return previewHistory.length === 0 ? { status: "empty" } : previewResource(previewHistory);
}
