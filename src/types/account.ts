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
};
