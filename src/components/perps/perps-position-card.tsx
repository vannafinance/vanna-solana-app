import { formatPercent, formatSignedPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import type { PositionSummary } from "@/types/perps";

import { formatLiquidationPrice, formatTokenSize } from "./format-perps";
import { PositionCard } from "./position-card";

type PerpsPositionCardProps = {
  position: PositionSummary;
  onAddCollateral: () => void;
  onClose: () => void;
};

export function PerpsPositionCard({ position, onAddCollateral, onClose }: PerpsPositionCardProps) {
  return (
    <PositionCard
      symbol={position.symbol}
      pair={position.pair}
      side={position.side}
      leverage={position.leverage}
      openedOn={position.openedOn}
      pnl={formatSignedUsd(position.pnl)}
      pnlPercent={formatSignedPercent(position.pnlBps)}
      pnlPositive={position.pnl >= 0n}
      size={formatUsd(position.sizeUsd)}
      sizeInToken={formatTokenSize(position.tokens, position.symbol)}
      collateral={formatUsd(position.collateral)}
      collateralToken="USDC"
      liquidationPrice={formatLiquidationPrice(position.liquidationPrice)}
      liquidationDistance={`${formatPercent(position.liquidationDistanceBps, 1)} away`}
      entryPrice={formatUsd(position.entryPrice)}
      markPrice={formatUsd(position.markPrice)}
      onAddCollateral={onAddCollateral}
      onClose={onClose}
    />
  );
}
