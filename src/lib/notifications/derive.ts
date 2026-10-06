import { formatToken } from "@/format/format-amount";
import { assets } from "@/lib/solana/assets";
import type { EarnEvent } from "@/lib/solana/earn-history";
import type { SpotSwap } from "@/lib/solana/spot-swaps";
import type { AppNotification } from "@/types/notification";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const decimalsOf = new Map(assets.map((asset) => [asset.symbol, asset.decimals]));

export const SAFE_HEALTH = 1.5;
export const LIQUIDATION_HEALTH = 1.1;

export type NotificationInput = {
  now: number;
  lastSeen: number;
  health: number | null;
  hasMarginAccount: boolean;
  healthAcknowledged: boolean;
  earnEvents: readonly EarnEvent[];
  swaps: readonly SpotSwap[];
};

function relativeTime(timestamp: number, now: number): string {
  const age = Math.max(now - timestamp, 0);
  if (age < HOUR) return `${Math.max(Math.floor(age / MINUTE), 1)}m`;
  if (age < 24 * HOUR) return `${Math.floor(age / HOUR)}h`;
  const date = new Date(timestamp);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function groupOf(timestamp: number, now: number): AppNotification["group"] {
  const date = new Date(timestamp);
  const today = new Date(now);
  const same = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
  return same ? "today" : "earlier";
}

const amountText = (symbol: EarnEvent["symbol"], raw: bigint) => `${formatToken({ raw, decimals: decimalsOf.get(symbol) ?? 0 }, 2)} ${symbol}`;

// Every item is something that really happened in the wallet or the margin account. Unread means newer than the
// last time the list was marked read.
export function deriveNotifications(input: NotificationInput): AppNotification[] {
  const { now, lastSeen } = input;
  const items: { at: number; item: AppNotification }[] = [];
  const add = (at: number, item: AppNotification) => items.push({ at, item });

  if (input.hasMarginAccount && input.health !== null) {
    const risky = input.health < SAFE_HEALTH;
    add(now, {
      id: "account-health",
      kind: "health",
      icon: "vanna",
      badge: risky ? "warning" : "safe",
      title: `Account health is ${input.health.toFixed(2)}`,
      message: risky ? `It liquidates at ${LIQUIDATION_HEALTH.toFixed(2)}. Add collateral or repay to move away from it.` : "Your margin account is in a safe range.",
      time: "now",
      group: "today",
      unread: risky && !input.healthAcknowledged,
    });
  }

  for (const event of input.earnEvents) {
    const supplied = event.kind === "supply";
    const failed = event.status === "failed";
    const amount = event.amount === null ? event.symbol : amountText(event.symbol, event.amount);
    add(event.timestamp, {
      id: `${event.signature}-${event.kind}`,
      kind: "earn",
      icon: event.symbol,
      badge: failed ? "warning" : supplied ? "opened" : "withdrawn",
      title: failed ? `${supplied ? "Supply" : "Withdrawal"} failed` : supplied ? `Supplied ${amount}` : `Withdrew ${amount}`,
      message: failed
        ? `${supplied ? `${amount} was not supplied` : `Nothing left the ${event.symbol} vault`}${event.reason ? `: ${event.reason}` : ""}.`
        : supplied
          ? `Now earning in the ${event.symbol} vault.`
          : `Sent from the ${event.symbol} vault to your wallet.`,
      time: relativeTime(event.timestamp, now),
      group: groupOf(event.timestamp, now),
      unread: event.timestamp > lastSeen,
    });
  }

  for (const swap of input.swaps) {
    const failed = swap.status === "failed";
    const sold = `${formatToken({ raw: swap.amountIn, decimals: swap.decimalsIn }, 2)} ${swap.from}`;
    add(swap.timestamp, {
      id: `${swap.signature}-swap`,
      kind: "trade",
      icon: swap.to,
      badge: failed ? "warning" : "swapped",
      title: failed ? `Swap of ${swap.from} for ${swap.to} failed` : `Swapped ${swap.from} for ${swap.to}`,
      message: failed
        ? `${sold} stayed in your wallet${swap.reason ? `: ${swap.reason}` : ""}.`
        : `${sold} for ${formatToken({ raw: swap.amountOut, decimals: swap.decimalsOut }, 2)} ${swap.to}.`,
      time: relativeTime(swap.timestamp, now),
      group: groupOf(swap.timestamp, now),
      unread: swap.timestamp > lastSeen,
    });
  }

  return items.sort((a, b) => b.at - a.at).map((entry) => entry.item);
}
