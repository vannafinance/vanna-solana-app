import { useQuery } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useWalletTransactionsOptions } from "@/hooks/use-wallet-transactions";
import { deriveNotifications } from "@/lib/notifications/derive";
import { getSeen, markSeen, subscribeSeen } from "@/lib/notifications/seen-store";
import { earnEventsFrom } from "@/lib/solana/earn-history";
import { spotSwapsFrom } from "@/lib/solana/spot-swaps";
import type { AppNotification } from "@/types/notification";

const NO_WALLET = "none";

// Notifications are derived from the live account and wallet history; nothing is stored except when the
// user last marked them read.
export function useNotificationFeed(): { items: AppNotification[]; ready: boolean; markAllRead: () => void } {
  const wallet = useWalletAddress();
  const snapshot = useAccountSnapshot(wallet);
  const history = useQuery({
    ...useWalletTransactionsOptions(wallet),
    select: (transactions) => ({ earn: earnEventsFrom(transactions), swaps: wallet === null ? [] : spotSwapsFrom(transactions, wallet) }),
  });
  const seen = useSyncExternalStore(subscribeSeen, () => getSeen(wallet ?? NO_WALLET));

  const now = Math.max(history.dataUpdatedAt, snapshot.dataUpdatedAt);
  const items = deriveNotifications({
    now,
    lastSeen: seen.at,
    health: snapshot.data?.health ?? null,
    hasMarginAccount: snapshot.data?.hasMarginAccount ?? false,
    healthAcknowledged: seen.healthAcknowledged,
    earnEvents: history.data?.earn ?? [],
    swaps: history.data?.swaps ?? [],
  });

  const markAllRead = () => {
    if (wallet === null) return;
    const latest = Math.max(now, ...(history.data?.earn ?? []).map((event) => event.timestamp), ...(history.data?.swaps ?? []).map((swap) => swap.timestamp));
    markSeen(wallet, latest);
  };

  return { items, ready: history.data !== undefined || snapshot.data !== undefined, markAllRead };
}
