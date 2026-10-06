import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatCompactUsd, formatPercent, formatSignedPercent, formatUsd } from "@/format/format-amount";
import { type ThemeColor, useTheme } from "@/theme/use-theme";
import type { FarmPool, FarmPoolRow } from "@/types/farm";

import { compactTokens, signedTone } from "./farm-format";
import { StatStrip } from "./stat-strip";

// The pool's name and Kamino's supply rate, the figure a farm earns on what it borrows.
export function PoolHeader({ pool, chevron = false }: { pool: FarmPool; chevron?: boolean }) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
      <TokenIcon symbol={pool.symbol} size={40} />
      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
        <AppText variant="bodyLg" strong>
          {pool.symbol}
        </AppText>
        <Pill label="Kamino" tone="pink" shape="tag" />
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <AppText variant="title" strong color="positive">
          {formatPercent(pool.supplyApyBps)}
        </AppText>
        <AppText variant="caption" color="textMuted">
          Supply APY
        </AppText>
      </View>
      {chevron ? <Icon name="chevron_right" size={20} color="textMuted" /> : null}
    </View>
  );
}

function Line({ label, value, color = "text" }: { label: string; value: string; color?: ThemeColor }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 24 }}>
      <AppText variant="body" color="textMuted" numberOfLines={1}>
        {label}
      </AppText>
      <AppText variant="body" strong color={color}>
        {value}
      </AppText>
    </View>
  );
}

// One pool on the Pools page. The net figure at 5x is the stock's whole return, since the stock itself earns nothing: it is
// shown in red when Vanna's borrow costs more than Kamino pays.
export function FarmPoolCard({ row, onPress }: { row: FarmPoolRow; onPress: () => void }) {
  const { spacing } = useTheme();
  const { pool } = row;
  const net = row.maxNetApyBps;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Farm into ${pool.symbol}, Kamino supply APY ${formatPercent(pool.supplyApyBps)}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
    >
      <Card>
        <View style={{ gap: spacing.md }}>
          <PoolHeader pool={pool} chevron />
          <StatStrip
            stats={[
              { label: "Total deposits", value: compactTokens({ raw: pool.totalSupplied, decimals: pool.decimals }, pool.symbol), sub: formatCompactUsd(row.totalSuppliedUsd) },
              { label: "Utilization", value: formatPercent(pool.utilizationBps) },
              { label: "Borrow APY", value: formatPercent(pool.borrowApyBps), sub: "Vanna loan" },
            ]}
          />
          <View style={{ gap: spacing.sm }}>
            <Line label={`Net APY at ${row.maxLeverage}x`} value={formatSignedPercent(net)} color={signedTone(net)} />
            {row.yoursUsd !== null ? <Line label="Your farm" value={formatUsd(row.yoursUsd)} /> : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
