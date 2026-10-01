import { useRef, useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatPercent, formatToken } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { FarmPool, PoolSymbol } from "@/types/farm";

import { AnchoredMenu, MenuChevron } from "./anchored-menu";
import { CapsLabel } from "./caps-label";
import { MenuOption } from "./menu-option";

type YieldPoolCardProps = {
  pools: readonly FarmPool[];
  selected: FarmPool;
  onSelect: (symbol: PoolSymbol) => void;
};

function availableText(pool: FarmPool) {
  return `${formatToken({ raw: pool.available, decimals: pool.decimals }, 0)} ${pool.symbol} available`;
}

export function YieldPoolCard({ pools, selected, onSelect }: YieldPoolCardProps) {
  const { colors, radius, shadow } = useTheme();
  const [open, setOpen] = useState(false);
  const trigger = useRef<View>(null);

  return (
    <View style={[{ borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: 16, paddingTop: 4 }, shadow.card]}>
      <View style={{ height: 44, justifyContent: "center" }}>
        <CapsLabel>YIELD POOL</CapsLabel>
      </View>
      <View ref={trigger} collapsable={false} style={{ marginBottom: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Yield pool, ${selected.symbol}`}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen(!open)}
          style={{
            minHeight: 64,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: open ? colors.primary : colors.divider,
            backgroundColor: colors.background,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <TokenIcon symbol={selected.symbol} size={36} />
          <View style={{ flex: 1 }}>
            <AppText variant="bodyLg" strong style={{ lineHeight: 22 }}>
              {selected.symbol}
            </AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ lineHeight: 16 }}>
              {selected.market}
            </AppText>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <AppText variant="bodyLg" strong color="positive">
              {formatPercent(selected.supplyApyBps)}
            </AppText>
            <AppText variant="caption" color="textMuted">
              Supply APY
            </AppText>
          </View>
          <MenuChevron open={open} size={16} color="textMuted" />
        </Pressable>
      </View>
      <AnchoredMenu open={open} anchor={trigger} onClose={() => setOpen(false)} accessibilityLabel="Yield pool" gap={6} placement={{ kind: "stretch", bleed: 4 }}>
        {pools.map((pool) => (
          <MenuOption
            key={pool.symbol}
            label={pool.symbol}
            selected={pool.symbol === selected.symbol}
            height={60}
            icon={<TokenIcon symbol={pool.symbol} size={32} />}
            onPress={() => {
              onSelect(pool.symbol);
              setOpen(false);
            }}
            trailing={
              <>
                <AppText variant="body" strong color="positive">
                  {`${formatPercent(pool.supplyApyBps)} APY`}
                </AppText>
                <AppText variant="caption" color="textMuted">
                  {availableText(pool)}
                </AppText>
              </>
            }
          />
        ))}
      </AnchoredMenu>
    </View>
  );
}
