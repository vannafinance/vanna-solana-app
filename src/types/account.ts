import type { AssetSymbol } from "@/lib/solana/assets";

export type MarginAccountSnapshot = {
  hasMarginAccount: boolean;
  address: string | null;
  collateral: bigint;
  borrowed: bigint;
  netAvailable: bigint;
  roomBeforeLiquidation: bigint;
  health: number | null;
  leverage: number | null;
  borrowRatePercent: number;
  // Per asset, in base units, as held in the margin account right now.
  collateralBalances: Partial<Record<AssetSymbol, bigint>>;
  borrowedBalances: Partial<Record<AssetSymbol, bigint>>;
};
