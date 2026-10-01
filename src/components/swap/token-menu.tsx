import { useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";

import { AnchoredMenu } from "@/components/perps/anchored-menu";
import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatSwapAmount } from "@/format/format-swap-amount";
import { useTheme } from "@/theme/use-theme";
import type { SwapSymbol, SwapToken } from "@/types/swap";

type TokenMenuProps = {
  tokens: readonly SwapToken[];
  selected: SwapToken;
  onSelect: (symbol: SwapSymbol) => void;
};

const MENU_WIDTH = 300;
const MAX_LIST_HEIGHT = 300;

export function TokenMenu({ tokens, selected, onSelect }: TokenMenuProps) {
  const { colors, fontFamily, fontSize, radius } = useTheme();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const visible = tokens.filter((token) => needle === "" || token.symbol.toLowerCase().includes(needle) || token.name.toLowerCase().includes(needle));

  return (
    <AnchoredMenu
      label="Choose token"
      width={MENU_WIDTH}
      align="right"
      overhang={4}
      renderTrigger={({ open, toggle }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Choose token, ${selected.symbol} selected`}
          accessibilityState={{ expanded: open }}
          android_ripple={ripple(colors.text)}
          onPress={() => {
            setQuery("");
            toggle();
          }}
          style={{
            height: 44,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingLeft: 6,
            paddingRight: 12,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: open ? colors.primary : colors.background,
            backgroundColor: colors.background,
            overflow: "hidden",
          }}
        >
          <TokenIcon symbol={selected.symbol} size={32} />
          <AppText variant="bodyLg" strong>
            {selected.symbol}
          </AppText>
          <Icon name="keyboard_arrow_down" size={14} color="text" rotate={open ? 180 : undefined} />
        </Pressable>
      )}
    >
      {(close) => (
        <View>
          <View style={{ height: 40, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, borderRadius: radius.sm, backgroundColor: colors.background }}>
            <Icon name="search" size={16} color="textMuted" />
            <TextInput
              accessibilityLabel="Search tokens"
              value={query}
              onChangeText={setQuery}
              placeholder="Search or paste address"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ flex: 1, padding: 0, fontSize: fontSize.body, fontFamily: fontFamily.regular, color: colors.text }}
            />
          </View>
          <ScrollView style={{ maxHeight: MAX_LIST_HEIGHT, marginTop: 4 }} keyboardShouldPersistTaps="handled">
            {visible.map((token) => {
              const active = token.symbol === selected.symbol;
              return (
                <Pressable
                  key={token.symbol}
                  accessibilityRole="button"
                  accessibilityLabel={`${token.symbol}, ${token.name}`}
                  accessibilityState={{ selected: active }}
                  android_ripple={ripple(colors.text)}
                  onPress={() => {
                    onSelect(token.symbol);
                    close();
                  }}
                  style={{
                    height: 52,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 8,
                    borderRadius: radius.sm,
                    overflow: "hidden",
                    backgroundColor: active ? colors.purpleTint : "transparent",
                  }}
                >
                  <TokenIcon symbol={token.symbol} size={32} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="body" strong>
                      {token.symbol}
                    </AppText>
                    <AppText variant="caption" color="textMuted" numberOfLines={1}>
                      {token.name}
                    </AppText>
                  </View>
                  <AppText variant="caption" strong color={token.balance > 0n ? "text" : "textMuted"}>
                    {formatSwapAmount(token.balance, token.decimals, token.symbol)}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </AnchoredMenu>
  );
}
