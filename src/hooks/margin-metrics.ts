import { previewAccount } from "@/lib/preview-data/home";

const SCALE = 1000n;

export type MarginMetrics = {
  netAvailable: bigint;
  health: number | null;
  leverage: number | null;
  roomBeforeLiquidation: bigint;
};

export function marginMetrics(collateral: bigint, debt: bigint): MarginMetrics {
  const netAvailable = collateral - debt;
  const liquidationFloor = (debt * BigInt(Math.round(previewAccount.liquidationHealth * 1000))) / SCALE;
  return {
    netAvailable,
    health: debt === 0n ? null : Number((collateral * SCALE) / debt) / 1000,
    leverage: netAvailable <= 0n ? null : Number((collateral * SCALE) / netAvailable) / 1000,
    roomBeforeLiquidation: collateral > liquidationFloor ? collateral - liquidationFloor : 0n,
  };
}
