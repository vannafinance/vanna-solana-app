import { CaretDown, CaretUp } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatToken } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { FarmPool, PoolSymbol } from "@/types/farm";

import { CapsLabel } from "./caps-label";
import { DropdownOption } from "./dropdown-option";

type PoolCardProps = {
  pools: readonly FarmPool[];
  selected: FarmPool;
  onSelect: (symbol: PoolSymbol) => void;
};

export function PoolCard({ pools, selected, onSelect }: PoolCardProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const Caret = open ? CaretUp : CaretDown;

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <CapsLabel>Yield pool</CapsLabel>
          <View style={{ paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.segment }}>
            <AppText variant="label" strong>
              KAMINO
            </AppText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Yield pool ${selected.symbol}, supply APY ${formatPercent(selected.supplyApyBps)}`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={{
            minHeight: 64,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: open ? colors.primary : colors.divider,
            backgroundColor: colors.background,
          }}
        >
          <TokenIcon symbol={selected.symbol} size={32} />
          <View style={{ flex: 1 }}>
            <AppText variant="title" strong>
              {selected.symbol}
            </AppText>
            <AppText variant="body" color="textMuted">
              {selected.market}
            </AppText>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <AppText variant="title" strong color="positive">
              {formatPercent(selected.supplyApyBps)}
            </AppText>
            <AppText variant="body" color="textMuted">
              Supply APY
            </AppText>
          </View>
          <Caret size={18} color={colors.text} />
        </Pressable>
        {open ? (
          <View style={{ gap: 4 }}>
            {pools.map((pool) => (
              <DropdownOption
                key={pool.symbol}
                symbol={pool.symbol}
                selected={pool.symbol === selected.symbol}
                primary={`${formatPercent(pool.supplyApyBps)} APY`}
                primaryColor="positive"
                secondary={`${formatToken({ raw: pool.available, decimals: pool.decimals }, 0)} ${pool.symbol} available`}
                onPress={() => {
                  onSelect(pool.symbol);
                  setOpen(false);
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}
