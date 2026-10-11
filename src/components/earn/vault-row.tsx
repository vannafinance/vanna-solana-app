import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/pill";
import { ripple } from "@/components/ui/ripple";
import { StatStrip } from "@/components/ui/stat-strip";
import { TokenIcon, type TokenSymbol } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

// A pool figure in the vault's own token, with its dollar value under it.
export type VaultFigure = { tokens: string; usd: string };

export type VaultRowProps = {
  symbol: TokenSymbol;
  name: string;
  apy: string;
  totalSupply: VaultFigure;
  available: VaultFigure;
  utilization: string;
  // What the connected wallet has here: a short number for the tag, and the full amount with its dollar value.
  yourSupply?: { short: string; full: string; usd: string };
  onPress: () => void;
};

// One vault on the Vaults page: name and supply APY, the pool's figures in a strip, and what the wallet supplied.
export function VaultRow({ symbol, name, apy, totalSupply, available, utilization, yourSupply, onPress }: VaultRowProps) {
  const { colors, spacing } = useTheme();
  const label = [
    `${symbol} vault`,
    `supply APY ${apy}`,
    `total supply ${totalSupply.tokens} ${symbol}`,
    `available ${available.tokens} ${symbol}`,
    `utilization ${utilization}`,
    ...(yourSupply ? [`you supplied ${yourSupply.full}`] : []),
  ].join(", ");

  return (
    <Card padded={false} style={{ overflow: "hidden" }}>
      <Pressable accessibilityRole="button" accessibilityLabel={label} android_ripple={ripple(colors.text)} onPress={onPress} style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <TokenIcon symbol={symbol} size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <AppText variant="bodyLg" strong numberOfLines={1} style={{ flexShrink: 1 }}>
                {symbol}
              </AppText>
              {yourSupply ? <Pill label={`You ${yourSupply.short}`} tone="teal" shape="tag" /> : null}
            </View>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {name}
            </AppText>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <AppText variant="bodyLg" strong color="positive" numberOfLines={1}>
              {apy}
            </AppText>
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              Supply APY
            </AppText>
          </View>
        </View>
        <StatStrip
          stats={[
            { label: "Total supply", value: totalSupply.tokens, sub: totalSupply.usd },
            { label: "Available", value: available.tokens, sub: available.usd },
            { label: "Utilization", value: utilization },
          ]}
        />
        {yourSupply ? (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md, paddingHorizontal: spacing.md }}>
            <AppText variant="body" color="textMuted" numberOfLines={1}>
              Your supply
            </AppText>
            <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
              <AppText variant="body" strong numberOfLines={1}>
                {yourSupply.full}
              </AppText>
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                {yourSupply.usd}
              </AppText>
            </View>
          </View>
        ) : null}
      </Pressable>
    </Card>
  );
}
