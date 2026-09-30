import { MagnifyingGlass } from "phosphor-react-native";
import { useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatSwapAmount } from "@/format/format-swap-amount";
import { useTheme } from "@/theme/use-theme";
import type { SwapSymbol, SwapToken } from "@/types/swap";

type TokenPickerSheetProps = {
  visible: boolean;
  tokens: readonly SwapToken[];
  selected: SwapSymbol;
  onSelect: (symbol: SwapSymbol) => void;
  onDismiss: () => void;
};

export function TokenPickerSheet({ visible, tokens, selected, onSelect, onDismiss }: TokenPickerSheetProps) {
  const { colors, fontSize, radius, spacing } = useTheme();
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const matches = tokens.filter((token) => token.symbol.toLowerCase().includes(needle) || token.name.toLowerCase().includes(needle));

  const dismiss = () => {
    setQuery("");
    onDismiss();
  };

  return (
    <BottomSheet visible={visible} onDismiss={dismiss}>
      <AppText variant="title" style={{ marginBottom: spacing.md }}>
        Select token
      </AppText>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          minHeight: 48,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          backgroundColor: colors.segment,
          marginBottom: spacing.sm,
        }}
      >
        <MagnifyingGlass size={20} color={colors.textMuted} />
        <TextInput
          accessibilityLabel="Search tokens"
          value={query}
          onChangeText={setQuery}
          placeholder="Search or paste address"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ flex: 1, padding: 0, fontSize: fontSize.bodyLg, color: colors.text }}
        />
      </View>
      <FlatList
        style={{ maxHeight: 360 }}
        data={matches}
        keyExtractor={(token) => token.symbol}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <AppText variant="body" color="textMuted" style={{ paddingVertical: spacing.xl, textAlign: "center" }}>
            No tokens found
          </AppText>
        }
        renderItem={({ item }) => {
          const active = item.symbol === selected;
          const balance = formatSwapAmount(item.balance, item.decimals, item.symbol);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.symbol}, ${item.name}, balance ${balance}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                onSelect(item.symbol);
                dismiss();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.md,
                minHeight: 64,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                backgroundColor: active ? colors.purpleTint : "transparent",
              }}
            >
              <TokenIcon symbol={item.symbol} size={40} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyLg" strong>
                  {item.symbol}
                </AppText>
                <AppText variant="label" color="textMuted">
                  {item.name}
                </AppText>
              </View>
              <AppText variant="bodyLg" color={item.balance > 0n ? "text" : "textMuted"}>
                {balance}
              </AppText>
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}
