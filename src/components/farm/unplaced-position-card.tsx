import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StatStrip } from "@/components/ui/stat-strip";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { UnplacedFarmPosition } from "@/types/farm";

import { withSymbol } from "./farm-format";

type UnplacedPositionCardProps = {
  position: UnplacedFarmPosition;
  onPress: () => void;
};

// A position the chain shows but whose stock the app cannot place, so it carries only what is certain: the amounts. It can
// still be closed: the Kamino part is redeemed and repaid, and any stock stays in the margin account. One with no loan is a
// 1x deploy, whose stock was swapped into the pool asset, so there is no stock to place.
export function UnplacedPositionCard({ position, onPress }: UnplacedPositionCardProps) {
  const { spacing } = useTheme();
  const plain = position.debt.raw === 0n;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={plain ? `Kamino ${position.pool} position at 1x, no loan. Manage it` : `Kamino ${position.pool} position, stock unknown. Close it`} onPress={onPress}>
      <Card>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 }}>
            <TokenIcon symbol={position.pool} size={40} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyLg" strong numberOfLines={1}>
                {`Kamino ${position.pool} position`}
              </AppText>
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                {plain ? "1x · no loan, tap to manage" : "Stock unknown, tap to close"}
              </AppText>
            </View>
            <Icon name="chevron_right" size={22} color="textMuted" />
          </View>
          <StatStrip
            stats={[
              { label: "In Kamino", value: withSymbol(position.supplied, position.pool) },
              plain ? { label: "Loan", value: "None", sub: "Nothing to liquidate" } : { label: "Owed to Vanna", value: withSymbol(position.debt, position.pool), sub: "With interest" },
            ]}
          />
        </View>
      </Card>
    </Pressable>
  );
}
