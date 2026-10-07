import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import Animated, { cancelAnimation, Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { TokenIcon } from "@/components/ui/token-icon";
import { brandGradient, horizontalGradient } from "@/theme/tokens";
import { type ThemeColor, useTheme } from "@/theme/use-theme";
import type { ClaimStatus, FaucetMessage, FaucetRow } from "@/types/faucet";

type FaucetSheetProps = {
  visible: boolean;
  rows: readonly FaucetRow[];
  message: FaucetMessage | null;
  connected: boolean;
  busy: boolean;
  onClaim: (symbol: FaucetRow["symbol"]) => void;
  onClaimAll: () => void;
  onDismiss: () => void;
};

const COLUMNS = 4;
const TILE_HEIGHT = 88;
const TILE_GAP = 8;
const LOGO_SIZE = 34;
const RING_SIZE = 44;
const BADGE_SIZE = 18;
const SPIN_MS = 900;

const LABEL: Record<ClaimStatus, { text: string; color: ThemeColor }> = {
  idle: { text: "Get", color: "link" },
  pending: { text: "Getting…", color: "textMuted" },
  done: { text: "Sent", color: "positive" },
  error: { text: "Try again", color: "negative" },
};

// A ring that turns around the logo while a token is on its way.
function SpinRing() {
  const { colors } = useTheme();
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withRepeat(withTiming(360, { duration: SPIN_MS, easing: Easing.linear }), -1);
    return () => cancelAnimation(turn);
  }, [turn]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: "absolute", width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderWidth: 2, borderColor: colors.divider, borderTopColor: colors.link }, style]}
    />
  );
}

function Tile({ row, disabled, onClaim }: { row: FaucetRow; disabled: boolean; onClaim: () => void }) {
  const { colors, radius } = useTheme();
  const label = LABEL[row.status];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Get test ${row.symbol}`}
      accessibilityState={{ busy: row.status === "pending", disabled }}
      disabled={disabled}
      onPress={onClaim}
      android_ripple={ripple(colors.text)}
      style={{ flex: 1, minHeight: TILE_HEIGHT, paddingVertical: 6, paddingHorizontal: 4, borderRadius: radius.md, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 2, backgroundColor: colors.background, opacity: disabled && row.status !== "pending" ? 0.5 : 1 }}
    >
      <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" }}>
        <TokenIcon symbol={row.symbol} size={LOGO_SIZE} />
        {row.status === "pending" ? <SpinRing /> : null}
        {row.status === "done" ? (
          <Animated.View
            entering={FadeIn.duration(180)}
            style={{ position: "absolute", right: -2, bottom: -2, width: BADGE_SIZE, height: BADGE_SIZE, borderRadius: BADGE_SIZE / 2, alignItems: "center", justifyContent: "center", backgroundColor: colors.badgePositive }}
          >
            <Icon name="check" size={12} color="onPrimary" bold />
          </Animated.View>
        ) : null}
      </View>
      {/* One line, shrunk to fit the tile: a long name such as ANTHROPIC used to wrap and push the label out of the tile. */}
      <AppText variant="caption" strong numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {row.symbol}
      </AppText>
      <AppText variant="caption" strong color={label.color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label.text}
      </AppText>
    </Pressable>
  );
}

// Claims every token at once, in the brand gradient. It fills the spare slots at the end of the grid; when the grid ends on a full row
// it is a bar of its own under the tiles, never a lone tile with empty space beside it.
function AllTile({ disabled, onClaimAll, span }: { disabled: boolean; onClaimAll: () => void; span: number }) {
  const { radius } = useTheme();
  const bar = span === 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Get all test tokens"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onClaimAll}
      style={{ flex: bar ? undefined : span, alignSelf: "stretch", minHeight: bar ? 52 : TILE_HEIGHT, borderRadius: radius.md, overflow: "hidden", opacity: disabled ? 0.5 : 1 }}
    >
      <LinearGradient
        colors={brandGradient}
        {...horizontalGradient}
        style={{ flex: 1, minHeight: bar ? 52 : TILE_HEIGHT, alignItems: "center", justifyContent: "center", gap: 2, flexDirection: bar ? "row" : "column" }}
      >
        <Icon name="add" size={bar ? 22 : 26} color="onPrimary" bold />
        <AppText variant="caption" strong color="onPrimary">
          Get all
        </AppText>
      </LinearGradient>
    </Pressable>
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

// Test tokens for the Vanna fork, as a grid of tiles: tap one to get that token. SOL is first because it pays for fees.
export function FaucetSheet({ visible, rows, message, connected, busy, onClaim, onClaimAll, onDismiss }: FaucetSheetProps) {
  const { colors, radius, spacing } = useTheme();
  const lines = chunk(rows, COLUMNS);
  const last = lines[lines.length - 1];
  const spare = COLUMNS - last.length;

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 40 }}>
        <AppText variant="title" style={{ fontSize: 20, lineHeight: 28 }}>
          Test faucet
        </AppText>
        <View style={{ minHeight: 24, paddingVertical: 1, paddingHorizontal: 10, borderRadius: radius.pill, justifyContent: "center", backgroundColor: colors.pinkTint }}>
          <AppText variant="caption" strong color="onPinkTint">
            Fork only
          </AppText>
        </View>
      </View>
      <AppText variant="body" color="textMuted" style={{ marginTop: spacing.xs }}>
        Tap a token to get some. Use them anywhere in Vanna.
      </AppText>
      <View style={{ marginTop: spacing.md, gap: TILE_GAP }}>
        {lines.map((line) => (
          <View key={line[0].symbol} style={{ flexDirection: "row", gap: TILE_GAP }}>
            {line.map((row) => (
              <Tile key={row.symbol} row={row} disabled={busy || !connected} onClaim={() => onClaim(row.symbol)} />
            ))}
            {line === last && spare > 0 ? <AllTile disabled={!connected || busy} onClaimAll={onClaimAll} span={spare} /> : null}
          </View>
        ))}
        {spare === 0 ? <AllTile disabled={!connected || busy} onClaimAll={onClaimAll} span={0} /> : null}
      </View>
      <View accessibilityLiveRegion="polite" style={{ marginTop: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 28 }}>
        <Icon name="info" size={16} color={message?.tone === "negative" || !connected ? "negative" : "textMuted"} />
        <AppText variant="caption" color={!connected || message?.tone === "negative" ? "negative" : message?.tone === "positive" ? "positive" : "textMuted"} style={{ flex: 1 }}>
          {connected ? (message?.text ?? "Test tokens for the Vanna fork. SOL pays for network fees.") : "Connect a wallet to use the faucet."}
        </AppText>
      </View>
    </BottomSheet>
  );
}
