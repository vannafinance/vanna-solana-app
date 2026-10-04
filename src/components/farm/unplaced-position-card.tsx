import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { UnplacedFarmPosition } from "@/types/farm";

import { Metric } from "./metric";
import { withSymbol } from "./farm-format";

type UnplacedPositionCardProps = {
  position: UnplacedFarmPosition;
  onPress: () => void;
};

// A position the chain shows but whose stock the app cannot place, so it carries only what is certain: the amounts. It can
// still be closed: the Kamino part is redeemed and repaid, and any stock stays in the margin account.
export function UnplacedPositionCard({ position, onPress }: UnplacedPositionCardProps) {
  const { colors, radius, shadow } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Kamino ${position.pool} position, close it`}
      onPress={onPress}
      style={[{ borderRadius: radius.md, backgroundColor: colors.surface, padding: 16, gap: 12 }, shadow.card]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <TokenIcon symbol={position.pool} size={40} />
        <View style={{ flex: 1 }}>
          <AppText variant="bodyLg" strong style={{ lineHeight: 22 }}>
            {`Kamino ${position.pool} position`}
          </AppText>
          <AppText variant="caption" color="textMuted">
            Its stock could not be read from history. Tap to close the Kamino part.
          </AppText>
        </View>
        <Icon name="chevron_right" size={22} color="textMuted" />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <Metric label="SUPPLIED" value={withSymbol(position.supplied, position.pool)} sub="In Kamino" />
        <Metric label="OWED" value={withSymbol(position.debt, position.pool)} sub="To Vanna, with interest" />
      </View>
    </Pressable>
  );
}
