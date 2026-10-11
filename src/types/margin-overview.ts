// What one product (Perps or Farm) holds inside the margin account.
export type MarginUse = { count: number; pnl: bigint; value: bigint };

// Trade and Farm both run on the one margin account, under one health factor. This is that account, as both modules show it.
export type MarginOverview = {
  hasMarginAccount: boolean;
  // Everything the account holds (deposits plus what was borrowed into it), at today's prices.
  collateral: bigint;
  borrowed: bigint;
  // Collateral minus borrowed: the part that is the user's own.
  net: bigint;
  // Gross collateral ÷ debt; null when nothing is borrowed. Liquidation at 1.10.
  health: number | null;
  // Collateral ÷ net.
  leverage: number | null;
  // How far the collateral's value can fall before health reaches 1.10, in dollars and as a share of the collateral.
  roomBeforeLiquidation: bigint;
  roomBps: number | null;
  // Null when that product's positions cannot be read.
  perps: MarginUse | null;
  farm: MarginUse | null;
};
