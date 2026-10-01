// Placeholder data mirroring devnet values in design/; replaced by RPC reads.
import type { AppNotification } from "@/types/notification";
import type { ClosedPosition, LenderActivityGroup, LenderVault, Position, TokenBalance } from "@/types/portfolio";

export const previewAccount = {
  walletAddress: "7xKXq3nQ2vLm9TrWc4Hd8eYbZ5uFjA1sGoN69fQa",
  marginAddress: "3pLmV8sRk2dXc7HwQ4aNfYb6TgJ9eZuC5oP1Uw2c",
  walletBalance: 4_812_400_000n,
  marginBalance: 10_592_290_000n,
  totalBorrowed: 6_271_920_000n,
  netEarnings: 1_370_000n,
  liquidationHealth: 1.1,
  lastSyncedMinutesAgo: 2,
} as const;

export const previewPositions: Position[] = [
  {
    id: "tslax-long",
    kind: "perp",
    symbol: "TSLAx",
    pair: "TSLAx-USDC",
    side: "long",
    leverage: 3,
    openedOn: "Sep 22",
    pnl: 152_520_000n,
    pnlBps: 1089,
    size: 4_352_690_000n,
    sizeTokens: { raw: 12_310_000n, decimals: 6 },
    collateral: 1_400_000_000n,
    liquidationPrice: 250_200_000n,
    liquidationAwayBps: 2920,
    entryPrice: 341_200_000n,
    markPrice: 353_590_000n,
  },
  {
    id: "openai-short",
    kind: "perp",
    symbol: "OPENAI",
    pair: "OPENAI-USDC",
    side: "short",
    leverage: 2,
    openedOn: "Sep 25",
    pnl: 57_710_000n,
    pnlBps: 577,
    size: 1_942_220_000n,
    sizeTokens: { raw: 917_400n, decimals: 6 },
    collateral: 1_000_000_000n,
    liquidationPrice: 2_972_800_000n,
    liquidationAwayBps: 4040,
    entryPrice: 2_180_000_000n,
    markPrice: 2_117_070_000n,
  },
  {
    id: "farm-googlx-usdc",
    kind: "farm",
    symbol: "GOOGLx",
    pair: "GOOGLx farm",
    leverage: 4,
    openedOn: "Sep 21",
    pnl: 1_470_000n,
    pnlBps: 0,
    size: 2_039_600_000n,
    sizeTokens: { raw: 1_500_000n, decimals: 6 },
    collateral: 509_900_000n,
    borrowed: 1_529_700_000n,
    health: 1.33,
    netAprBps: 423,
    venue: "Kamino",
    liquidationPrice: 101_010_000n,
    liquidationAwayBps: 7000,
  },
];

export const previewClosedPositions: ClosedPosition[] = [
  {
    id: "aaplx-long",
    symbol: "AAPLx",
    pair: "AAPLx-USDC",
    kind: "perp",
    side: "long",
    leverage: 2,
    closedOn: "Sep 24",
    duration: "3 days",
    pnl: 38_430_000n,
    pnlBps: 384,
    entryPrice: 318_100_000n,
    exitPrice: 324_200_000n,
    sizeTokens: { raw: 6_300_000n, decimals: 6 },
    collateral: 1_000_000_000n,
    fees: 1_260_000n,
  },
  {
    id: "anthropic-farm",
    symbol: "ANTHROPIC",
    pair: "ANTHROPIC farm",
    kind: "farm",
    leverage: 3,
    closedOn: "Sep 19",
    duration: "9 days",
    pnl: 6_120_000n,
    pnlBps: 61,
    sizeTokens: { raw: 960_000n, decimals: 6 },
    collateral: 1_000_000_000n,
    fees: 0n,
    farm: { borrowed: 2_002_120_000n, deployedTo: "Kamino USDC", netAprBps: 876 },
  },
  {
    id: "googlx-short",
    symbol: "GOOGLx",
    pair: "GOOGLx-USDC",
    kind: "perp",
    side: "short",
    leverage: 3,
    closedOn: "Sep 18",
    duration: "2 days",
    pnl: -21_040_000n,
    pnlBps: -301,
    entryPrice: 334_100_000n,
    exitPrice: 339_110_000n,
    sizeTokens: { raw: 4_200_000n, decimals: 6 },
    collateral: 700_000_000n,
    fees: 840_000n,
  },
  {
    id: "openai-long-closed",
    symbol: "OPENAI",
    pair: "OPENAI-USDC",
    kind: "perp",
    side: "long",
    leverage: 2,
    closedOn: "Sep 8",
    duration: "5 days",
    pnl: 12_800_000n,
    pnlBps: 256,
    entryPrice: 2_090_000_000n,
    exitPrice: 2_118_000_000n,
    sizeTokens: { raw: 457_100n, decimals: 6 },
    collateral: 500_000_000n,
    fees: 380_000n,
  },
];

export const previewVaults: LenderVault[] = [
  {
    id: "usdc-vault",
    symbol: "USDC",
    name: "USDC vault",
    value: 2_499_750_000n,
    supplied: { raw: 2_500_000_000n, decimals: 6 },
    supplyApyBps: 3,
    earned: 810_000n,
  },
  {
    id: "sol-vault",
    symbol: "SOL",
    name: "SOL vault",
    value: 177_870_000n,
    supplied: { raw: 1_500_000_000n, decimals: 9 },
    supplyApyBps: 11,
    earned: 560_000n,
  },
];

export const previewLenderPortfolio = 2_677_870_000n;

export const previewSpot: TokenBalance[] = [
  { symbol: "USDC", tokens: { raw: 3_120_400_000n, decimals: 6 }, value: 3_120_400_000n, changeTodayBps: 0 },
  { symbol: "ANTHROPIC", tokens: { raw: 960_000n, decimals: 6 }, value: 1_001_060_000n, changeTodayBps: 240 },
  { symbol: "TSLAx", tokens: { raw: 1_250_000n, decimals: 6 }, value: 441_990_000n, changeTodayBps: 120 },
  { symbol: "SOL", tokens: { raw: 2_100_000_000n, decimals: 9 }, value: 248_950_000n, changeTodayBps: -80 },
];

export const previewLenderHistory: LenderActivityGroup[] = [
  {
    label: "Today",
    items: [{ id: "interest", kind: "interest", title: "Interest paid", detail: "USDC vault · 9h ago", valueUsd: 120_000n, gain: true }],
  },
  {
    label: "Sep 25",
    items: [{ id: "withdraw-usdc", kind: "withdraw", title: "Withdrew 500 USDC", detail: "USDC vault · to wallet", valueUsd: 499_950_000n }],
  },
  {
    label: "Sep 22",
    items: [{ id: "supply-sol", kind: "supply", title: "Supplied 1.50 SOL", detail: "SOL vault · from wallet", valueUsd: 177_870_000n }],
  },
  {
    label: "Sep 20",
    items: [
      { id: "supply-usdc", kind: "supply", title: "Supplied 3,000 USDC", detail: "USDC vault · from wallet", valueUsd: 2_999_700_000n },
      { id: "shares", kind: "shares", title: "Received vUSDC", detail: "Vault shares minted", valueLabel: "3,000 vUSDC" },
    ],
  },
];

export const previewNotifications: AppNotification[] = [
  {
    id: "googlx-health",
    kind: "health",
    icon: "GOOGLx",
    badge: "warning",
    title: "GOOGLx farm health is 1.33",
    message: "It liquidates at 1.10, if GOOGLx falls below $101.01. Nothing to do yet.",
    time: "2h",
    group: "today",
    unread: true,
    action: { label: "View position", target: "farm" },
  },
  {
    id: "tslax-up",
    kind: "trade",
    icon: "TSLAx",
    badge: "gain",
    title: "TSLAx long is up 10.89%",
    message: "+$152.52 unrealized on your 3x long.",
    time: "5h",
    group: "today",
    unread: true,
    action: { label: "View position", target: "perps" },
  },
  {
    id: "usdc-earned",
    kind: "earn",
    icon: "USDC",
    badge: "earned",
    title: "You earned $0.12",
    message: "Interest from the USDC vault landed.",
    time: "9h",
    group: "today",
    unread: true,
  },
  {
    id: "openai-short",
    kind: "trade",
    icon: "OPENAI",
    badge: "opened",
    title: "OPENAI short opened",
    message: "0.9174 OPENAI at $2,180.00 · 2x · $1,000 collateral.",
    time: "Sep 25",
    group: "earlier",
    unread: false,
  },
  {
    id: "usdc-withdrew",
    kind: "earn",
    icon: "USDC",
    badge: "withdrawn",
    title: "Withdrew 500 USDC",
    message: "Sent from the USDC vault to your wallet.",
    time: "Sep 25",
    group: "earlier",
    unread: false,
  },
  {
    id: "aaplx-closed",
    kind: "trade",
    icon: "AAPLx",
    badge: "closed",
    title: "AAPLx long closed in profit",
    message: "Realized +$38.43 (+3.84%) after 3 days.",
    time: "Sep 24",
    group: "earlier",
    unread: false,
  },
  {
    id: "account-safe",
    kind: "health",
    icon: "vanna",
    badge: "safe",
    title: "Account back to Safe",
    message: "Margin account health is 1.69 after your deposit.",
    time: "Sep 23",
    group: "earlier",
    unread: false,
  },
];

function previewFlag(initial: boolean) {
  const listeners = new Set<() => void>();
  let current = initial;
  return {
    get: () => current,
    set: (next: boolean) => {
      current = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const onlineFlag = previewFlag(true);
