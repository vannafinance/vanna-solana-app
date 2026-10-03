import { useSyncExternalStore } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useEarnEvents } from "@/hooks/use-earn-events";
import { useSpotSwaps } from "@/hooks/use-spot-swaps";
import { deriveNotifications } from "@/lib/notifications/derive";
import { getSeen, markSeen, subscribeSeen } from "@/lib/notifications/seen-store";
import type { AppNotification } from "@/types/notification";

const NO_WALLET = "none";

// Notifications are derived from the live account and wallet history; nothing is stored except when the
// user last marked them read.
export function useNotificationFeed(): { items: AppNotification[]; ready: boolean; markAllRead: () => void } {
  const wallet = useWalletAddress();
  const snapshot = useAccountSnapshot(wallet);
  const earn = useEarnEvents(wallet);
  const swaps = useSpotSwaps(wallet);
  const seen = useSyncExternalStore(subscribeSeen, () => getSeen(wallet ?? NO_WALLET));

  const now = Math.max(earn.dataUpdatedAt, swaps.dataUpdatedAt, snapshot.dataUpdatedAt);
  const items = deriveNotifications({
    now,
    lastSeen: seen.at,
    health: snapshot.data?.health ?? null,
    hasMarginAccount: snapshot.data?.hasMarginAccount ?? false,
    healthAcknowledged: seen.healthAcknowledged,
    earnEvents: earn.data ?? [],
    swaps: swaps.data ?? [],
  });

  const markAllRead = () => {
    if (wallet === null) return;
    const latest = Math.max(now, ...(earn.data ?? []).map((event) => event.timestamp), ...(swaps.data ?? []).map((swap) => swap.timestamp));
    markSeen(wallet, latest);
  };

  return { items, ready: earn.data !== undefined || swaps.data !== undefined || snapshot.data !== undefined, markAllRead };
}
