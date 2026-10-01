import { useCallback } from "react";

import { useEarnEvents } from "@/hooks/use-earn-events";
import { useOraclePrices } from "@/hooks/use-oracle-prices";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { groupEarnHistory } from "@/lib/earn/group-history";
import type { EarnHistoryGroup } from "@/types/earn";
import type { Resource } from "@/types/resource";

export function useEarnHistory(): Resource<readonly EarnHistoryGroup[]> {
  const wallet = useWalletAddress();
  const events = useEarnEvents(wallet);
  const prices = useOraclePrices();
  const { refetch } = events;
  const retry = useCallback(() => void refetch(), [refetch]);

  if (wallet === null || (events.data !== undefined && events.data.length === 0)) return { status: "empty" };
  if (events.data === undefined) return events.isError ? { status: "error", error: events.error, retry } : { status: "loading" };
  return { status: "ready", stale: events.isError, refresh: retry, data: groupEarnHistory(events.data, prices.data ?? {}, events.dataUpdatedAt) };
}
