import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { spaceRoutes } from "@/navigation/routes";
import { type Space, spaces } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import type { IconName } from "./material-symbols";
import { TokenIcon } from "./token-icon";
import { VannaMark } from "./vanna-mark";
import { VannaWordmark } from "./vanna-wordmark";

const TAB_HEIGHT = 86;
const RADIUS = 16;
const FLARE = 6;
const SHOULDER = 12;
const SIDE = FLARE + RADIUS;
const INACTIVE_FILL = "rgba(255,255,255,0.07)";

const tabs: readonly { space: Space; label: string; icon: IconName }[] = [
  { space: "portfolio", label: "Portfolio", icon: "pie_chart" },
  { space: "earn", label: "Earn", icon: "savings" },
  { space: "trade", label: "Trade", icon: "candlestick_chart" },
  { space: "farm", label: "Farm", icon: "eco" },
];

const fillParent = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;

type SpaceHeaderProps = {
  space: Space;
  notificationCount?: number;
  onNotifications: () => void;
  onAvatar: () => void;
  avatar?: ReactNode;
  children?: ReactNode;
};

function FolderTabShape({ width, selected, fill }: { width: number; selected: boolean; fill: string }) {
  const height = selected ? TAB_HEIGHT + 1 : TAB_HEIGHT;
  const top = selected ? 0 : 2;
  const left = selected
    ? `M ${-SHOULDER} ${height} Q 0 ${height} ${FLARE * 0.2} ${height - SHOULDER} L ${FLARE} ${RADIUS} Q ${FLARE} 0 ${SIDE} 0 L ${SIDE + 1} 0 L ${SIDE + 1} ${height} Z`
    : `M 0 ${height} L ${FLARE} ${RADIUS + 2} Q ${FLARE} 2 ${SIDE} 2 L ${SIDE} ${height} Z`;
  const right = selected
    ? `M ${SHOULDER} ${height} Q 0 ${height} ${-FLARE * 0.2} ${height - SHOULDER} L ${-FLARE} ${RADIUS} Q ${-FLARE} 0 ${-SIDE} 0 L ${-SIDE - 1} 0 L ${-SIDE - 1} ${height} Z`
    : `M 0 ${height} L ${-FLARE} ${RADIUS + 2} Q ${-FLARE} 2 ${-SIDE} 2 L ${-SIDE} ${height} Z`;

  return (
    <Svg width={width + 2 * SHOULDER} height={height} style={{ position: "absolute", left: -SHOULDER, top: 0 }}>
      <Path d={left} fill={fill} transform={`translate(${SHOULDER} 0)`} />
      <Rect x={SHOULDER + SIDE} y={top} width={Math.max(width - 2 * SIDE, 0)} height={height - top} fill={fill} />
      <Path d={right} fill={fill} transform={`translate(${SHOULDER + width} 0)`} />
    </Svg>
  );
}

function FolderTab({ space, label, icon, selected }: { space: Space; label: string; icon: IconName; selected: boolean }) {
  const [width, setWidth] = useState(0);
  const fill = selected ? spaces[space].panel[0] : INACTIVE_FILL;
  const dim = selected ? 1 : 0.78;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={() => !selected && router.navigate(spaceRoutes[space])}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flex: 1, height: TAB_HEIGHT, zIndex: selected ? 2 : 1 }}
    >
      {width > 0 ? <FolderTabShape width={width} selected={selected} fill={fill} /> : null}
      <View style={{ ...fillParent, alignItems: "center", justifyContent: "center", gap: 6, paddingTop: 4 }}>
        <View style={{ opacity: dim }}>
          <Icon name={icon} size={selected ? 28 : 26} color="onHero" filled={selected} />
        </View>
        <AppText variant="label" strong={selected} color="onHero" style={{ opacity: dim }}>
          {label}
        </AppText>
      </View>
    </Pressable>
  );
}

export function SpaceHeader({ space, notificationCount = 0, onNotifications, onAvatar, avatar = <TokenIcon symbol="SOL" size={40} />, children }: SpaceHeaderProps) {
  const { colors, radius, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const { band, panel } = spaces[space];

  return (
    <View>
      <StatusBar style="light" />
      <LinearGradient colors={band} style={{ paddingTop: insets.top, paddingHorizontal: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: spacing.xs }}>
          <View accessibilityLabel="Vanna" style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <VannaMark size={30} />
            <VannaWordmark color={colors.onHero} height={17} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={onNotifications}
            hitSlop={8}
            style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: spacing.sm }}
          >
            <Icon name="notifications" size={24} color="onHero" />
            {notificationCount > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: 4,
                  right: 2,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  borderRadius: radius.pill,
                  backgroundColor: colors.badge,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AppText variant="caption" strong color="onHero" style={{ fontSize: 11, lineHeight: 14 }}>
                  {notificationCount}
                </AppText>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={onAvatar}
            style={{ width: 44, height: 44, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.onHero, overflow: "hidden" }}
          >
            {avatar}
          </Pressable>
        </View>
        <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, marginTop: 10 }}>
          {tabs.map((tab) => (
            <FolderTab key={tab.space} {...tab} selected={tab.space === space} />
          ))}
        </View>
      </LinearGradient>
      {children ? (
        <LinearGradient
          colors={panel}
          style={{ borderBottomLeftRadius: radius.hero, borderBottomRightRadius: radius.hero, paddingHorizontal: spacing.lg, paddingTop: 20, paddingBottom: 20 }}
        >
          {children}
        </LinearGradient>
      ) : (
        <LinearGradient colors={panel} style={{ height: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }} />
      )}
    </View>
  );
}
