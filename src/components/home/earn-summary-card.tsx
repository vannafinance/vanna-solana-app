import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatStrip } from "@/components/ui/stat-strip";
import { formatPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { LenderSummary } from "@/types/portfolio";

import { CardTitle } from "./card-title";
import { vaultNames } from "./portfolio-format";

type EarnSummaryCardProps = {
  data: LenderSummary;
  // Opens the Lender page.
  onOpen?: () => void;
  // Shown when nothing is supplied.
  onBrowse?: () => void;
};

// What the user lends in Earn: supplied value, the value-weighted supply APY, and interest earned.
export function EarnSummaryCard({ data, onOpen, onBrowse }: EarnSummaryCardProps) {
  const { spacing } = useTheme();

  if (data.vaults.length === 0) {
    return (
      <Card>
        <CardTitle title="Earn" subtitle="Nothing supplied yet" />
        {onBrowse ? (
          <View style={{ marginTop: spacing.md }}>
            <Button size="sm" variant="outline" label="Browse vaults" onPress={onBrowse} />
          </View>
        ) : null}
      </Card>
    );
  }

  const earned = data.earned;
  return (
    <Card>
      <CardTitle title="Earn" subtitle={vaultNames(data.vaults.map((vault) => vault.symbol))} actionLabel={onOpen ? "See lending" : undefined} onAction={onOpen} />
      <View style={{ marginTop: spacing.md }}>
        <StatStrip
          stats={[
            { label: "Supplied", value: formatUsd(data.supplied) },
            { label: "Avg APY", value: data.avgSupplyApyBps === null ? "—" : formatPercent(data.avgSupplyApyBps) },
            { label: "Earned", value: earned === null ? "—" : formatSignedUsd(earned), valueColor: earned !== null && earned > 0n ? "positive" : undefined },
          ]}
        />
      </View>
    </Card>
  );
}
