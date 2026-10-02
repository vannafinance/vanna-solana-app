import { useSyncExternalStore } from "react";
import { Linking } from "react-native";

import { explorerTransactionUrl } from "@/lib/solana/explorer";
import { farmClosedCount, farmClosedEarningsUsd, farmHistory, getFarmPositions, subscribeFarmPositions } from "@/lib/preview-data/farm";
import type { FarmHistoryView } from "@/types/farm";
import type { Resource } from "@/types/resource";

export function useFarmHistory() {
  const open = useSyncExternalStore(subscribeFarmPositions, getFarmPositions);
  const history: Resource<FarmHistoryView> =
    farmHistory.length === 0
      ? { status: "empty" }
      : {
          status: "ready",
          data: { earnedUsd: farmClosedEarningsUsd, closedCount: farmClosedCount, openCount: open.length, entries: farmHistory },
        };

  return { history, openTransaction: (signature: string) => void Linking.openURL(explorerTransactionUrl(signature)) };
}
