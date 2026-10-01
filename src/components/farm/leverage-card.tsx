import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { formatPercent } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { DeployForm } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { formatBorrow } from "./farm-format";
import { LeverageSlider } from "./leverage-slider";
import { PoolDetails } from "./pool-details";

type LeverageCardProps = {
  form: DeployForm;
  minLeverage: number;
  maxLeverage: number;
  onChangeLeverage: (value: number) => void;
};

function subtitle(form: DeployForm) {
  if (form.quote.healthFactor === null) return "At 1x nothing is borrowed, so nothing is farmed.";
  return `Borrows ${formatBorrow(form)} from Vanna at ${formatPercent(form.pool.borrowApyBps)}`;
}

export function LeverageCard({ form, minLeverage, maxLeverage, onChangeLeverage }: LeverageCardProps) {
  const { colors, radius, shadow } = useTheme();

  return (
    <View style={[{ borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 16 }, shadow.card]}>
      <View style={{ height: 44, justifyContent: "center" }}>
        <CapsLabel>LEVERAGE</CapsLabel>
      </View>
      <LeverageSlider value={form.leverage} min={minLeverage} max={maxLeverage} onChange={onChangeLeverage} />
      <AppText variant="caption" color="textMuted" style={{ marginBottom: 14, lineHeight: 16 }}>
        {subtitle(form)}
      </AppText>
      <PoolDetails form={form} />
    </View>
  );
}
