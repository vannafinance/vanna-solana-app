import { View } from "react-native";

import { AmountField } from "@/components/ui/amount-field";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenPill } from "@/components/ui/token-pill";
import { useTheme } from "@/theme/use-theme";
import type { SwapSymbol } from "@/types/swap";

type QuickFill = { label: string; fraction: number };

type SwapTokenCardProps = {
  label: string;
  balance: string;
  symbol: SwapSymbol;
  onPressToken: () => void;
  usdValue: string;
  value: string;
  onChangeText?: (value: string) => void;
  quickFills?: readonly QuickFill[];
  onQuickFill?: (fraction: number) => void;
  error?: string;
};

export function SwapTokenCard({
  label,
  balance,
  symbol,
  onPressToken,
  usdValue,
  value,
  onChangeText,
  quickFills,
  onQuickFill,
  error,
}: SwapTokenCardProps) {
  const { spacing } = useTheme();
  const tokenSlot = <TokenPill symbol={symbol} onPress={onPressToken} />;

  if (onChangeText) {
    return (
      <Card>
        <AmountField
          label={label}
          caption={balance}
          value={value}
          onChangeText={onChangeText}
          tokenSlot={tokenSlot}
          secondary={usdValue}
          quickFills={quickFills}
          onQuickFill={onQuickFill}
          error={error}
        />
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <AppText variant="body" color="textMuted">
            {label}
          </AppText>
          <AppText variant="body" color="textMuted">
            {balance}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          <AppText
            accessibilityLabel={`${label} ${value || "0"}`}
            numberOfLines={1}
            adjustsFontSizeToFit
            variant="display"
            color={value ? "text" : "textMuted"}
            style={{ flex: 1, fontSize: 40, lineHeight: 52 }}
          >
            {value || "0.00"}
          </AppText>
          {tokenSlot}
        </View>
        <AppText variant="body" color="textMuted">
          {usdValue}
        </AppText>
      </View>
    </Card>
  );
}
