import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { UnplacedFarmPosition } from "@/types/farm";

import { Metric } from "./metric";
import { withSymbol } from "./farm-format";

type UnplacedPositionCardProps = {
  position: UnplacedFarmPosition;
};

// A position the chain shows but whose stock the app cannot place, so it carries only what is certain: the amounts.
export function UnplacedPositionCard({ position }: UnplacedPositionCardProps) {
  const { colors, radius, shadow } = useTheme();

  return (
    <View accessible style={[{ borderRadius: radius.md, backgroundColor: colors.surface, padding: 16, gap: 12 }, shadow.card]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TokenIcon symbol={position.pool} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyLg" strong style={{ lineHeight: 22 }}>
            {`Kamino ${position.pool} position`}
          </AppText>
          <AppText variant="caption" color="textMuted">
            Opened before the history this app reads, so its stock is not shown.
          </AppText>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric label="SUPPLIED" value={withSymbol(position.supplied, position.pool)} sub="In Kamino" />
        <Metric label="OWED" value={withSymbol(position.debt, position.pool)} sub="To Vanna, with interest" />
      </View>
    </View>
  );
}
