import { Pressable, View } from "react-native";

import { AccountHealth } from "@/components/profile/account-health-card";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Pill } from "@/components/ui/pill";
import { ripple } from "@/components/ui/ripple";
import { StatusBadge } from "@/components/ui/status-badge";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";
import type { Position } from "@/types/portfolio";

import { CardTitle } from "./card-title";
import { pnlColor, pnlText, sideLabel } from "./position-format";

// The Overview card shows this many positions; the rest are one tap away on the Trader page.
const SHOWN = 3;

type MarginAccountCardProps = {
  // Null when nothing is borrowed: there is no ratio to draw.
  health: number | null;
  // The open Margin trade and Farm positions, in the Trader page's order; null when they cannot be read.
  positions: Position[] | null;
  onSeeAll: () => void;
  onOpenPosition: (position: Position) => void;
};

// The account-health gauge from Profile; with nothing borrowed there is no ratio to draw, so a badge says so instead.
function Health({ health }: { health: number | null }) {
  const { spacing } = useTheme();

  if (health === null) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <AppText variant="body" color="textMuted">
          Account health
        </AppText>
        <View>
          <StatusBadge tone="success" label="No debt" />
        </View>
      </View>
    );
  }
  return (
    <View style={{ paddingVertical: spacing.xs }}>
      <AccountHealth health={health} />
    </View>
  );
}

// One open position in a line: token, pair over its side and leverage, P&L on the right over its percentage.
function PositionRow({ position, onPress }: { position: Position; onPress: () => void }) {
  const { colors, spacing } = useTheme();
  const farm = position.kind === "farm";
  const pair = farm ? `${position.symbol} → USDC` : position.pair;
  const side = sideLabel(farm ? undefined : position.side, position.leverage);
  const { amount, percent } = pnlText(position.pnl, position.pnlBps);
  const color = pnlColor(position.pnl);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pair}, ${side}, P&L ${amount}, ${percent}`}
      onPress={onPress}
      android_ripple={ripple(colors.text)}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 64, borderTopWidth: 1, borderTopColor: colors.divider }}
    >
      <TokenIcon symbol={position.symbol} size={36} />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="body" strong numberOfLines={1}>
          {pair}
        </AppText>
        <Pill shape="tag" tone={farm ? "teal" : position.side} label={side} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <AppText variant="body" strong color={color} numberOfLines={1}>
          {amount}
        </AppText>
        <AppText variant="caption" color={color} numberOfLines={1}>
          {percent}
        </AppText>
      </View>
      <Icon name="chevron_right" size={20} color="textMuted" />
    </Pressable>
  );
}

// The one margin account that Margin trade and Farm share: its health gauge, then the first open positions in it.
export function MarginAccountCard({ health, positions, onSeeAll, onOpenPosition }: MarginAccountCardProps) {
  const { colors, spacing } = useTheme();
  const message = positions === null ? "Can't load positions right now" : positions.length === 0 ? "No open positions" : null;

  return (
    <Card>
      <CardTitle title="Margin account" actionLabel="See all" onAction={onSeeAll} />
      <View style={{ marginTop: spacing.md }}>
        <Health health={health} />
      </View>
      <View style={{ marginTop: spacing.md, marginBottom: -spacing.xs }}>
        {message === null ? (
          positions?.slice(0, SHOWN).map((position) => <PositionRow key={position.id} position={position} onPress={() => onOpenPosition(position)} />)
        ) : (
          <View style={{ minHeight: 52, justifyContent: "center", borderTopWidth: 1, borderTopColor: colors.divider }}>
            <AppText variant="body" color="textMuted" numberOfLines={1}>
              {message}
            </AppText>
          </View>
        )}
      </View>
    </Card>
  );
}
