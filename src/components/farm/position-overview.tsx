import { View } from "react-native";

import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { FarmPositionView } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { PositionSummary } from "./position-summary";

type PositionOverviewProps = {
  position: FarmPositionView;
};

// The top of a position's page: the same blocks as its card on the Positions tab, then the rates the loan earns and pays.
export function PositionOverview({ position }: PositionOverviewProps) {
  const { spacing } = useTheme();

  return (
    <>
      <Card>
        <PositionSummary position={position} />
      </Card>
      <Card>
        <View style={{ gap: spacing.md }}>
          <CapsLabel>RATES</CapsLabel>
          <StatStrip
            stats={[
              { label: "Supply APY", value: formatPercent(position.supplyApyBps), sub: `Kamino ${position.poolSymbol}` },
              { label: "Borrow APY", value: formatPercent(position.borrowApyBps), sub: "Vanna loan" },
              { label: "Net APR", value: formatPercent(position.netAprBps), sub: "On the loan" },
            ]}
          />
        </View>
      </Card>
    </>
  );
}
