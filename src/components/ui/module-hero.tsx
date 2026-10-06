import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { type ThemeColor, useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import type { IconName } from "./material-symbols";
import { Money } from "./money";

export type HeroTone = "plain" | "positive" | "negative" | "watch";

// A figure in the header's bottom row. `badge` is a status pill beside the value (e.g. a health factor's "Safe"); `aside` is a
// smaller figure on the value's line, pushed to the column's right edge; `sub` is a short line under it that says what the
// number means; `meter` (0 to 1) draws a thin bar across the column instead, so a short figure still fills its column;
// `weight` widens a column whose label is long.
export type HeroStat = {
  label: string;
  value: string;
  tone?: HeroTone;
  badge?: { text: string; tone: HeroTone };
  aside?: string;
  sub?: string;
  meter?: { fill: number; tone?: HeroTone };
  weight?: number;
};

// A small glass pill under the headline number: a figure that qualifies it (P&L, open positions), never a sentence.
export type HeroChip = { text: string; icon?: IconName; tone?: HeroTone };

// The parts that make up the headline figure, as a key under it (a filled dot, then a hollow one), drawn as the ring beside it.
export type HeroPart = { label: string; value: string };
export type HeroRing = {
  parts: readonly [HeroPart, HeroPart];
  firstShare: number;
  center: string;
  caption: string;
};

type ModuleHeroProps = {
  label: string;
  // A dollar figure ("$2,774.50") dims its cents; anything else ("+$104.41", "2.86%") is shown as written.
  value: string;
  valueTone?: HeroTone;
  money?: boolean;
  // Under the number: up to two chips, or the key of a ring drawn to the right of the number. The row is kept even when
  // empty, so every module's header has the same height.
  chips?: readonly HeroChip[];
  ring?: HeroRing;
  // Only for placeholders (loading, errors, nothing set up yet): one short line in place of the chips.
  caption?: string;
  accessory?: ReactNode;
  // Two or three columns.
  stats: readonly HeroStat[];
};

// Every module's header holds exactly this block, so switching module never moves the page pills or the content below.
export const MODULE_HERO_HEIGHT = 180;

const VALUE_STYLE = {
  fontSize: 34,
  lineHeight: 42,
  letterSpacing: -0.6,
} as const;
const DETAIL_ROW = 40;
const RING_SIZE = 92;
const RING_STROKE = 10;

function toneColor(tone: HeroTone | undefined): ThemeColor {
  if (tone === "positive") return "heroPositive";
  if (tone === "negative") return "healthWatch";
  if (tone === "watch") return "healthWatch";
  return "onHero";
}

function Chip({ chip }: { chip: HeroChip }) {
  const { colors, radius } = useTheme();
  const ink = toneColor(chip.tone);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        height: 24,
        paddingHorizontal: 10,
        borderRadius: radius.pill,
        // A dark glass, not a light one: the teal and pink figures read on it in both themes, where on the header's own colour they fade.
        backgroundColor: chip.tone === undefined ? colors.heroGlass : "rgba(10,2,30,0.55)",
      }}
    >
      {chip.icon ? <Icon name={chip.icon} size={14} color={colors[ink]} /> : null}
      <AppText variant="caption" strong numberOfLines={1} color={ink}>
        {chip.text}
      </AppText>
    </View>
  );
}

function Stat({ stat, first }: { stat: HeroStat; first: boolean }) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${stat.label}, ${stat.value}${stat.badge ? `, ${stat.badge.text}` : ""}${stat.aside ? `, ${stat.aside}` : ""}${stat.sub ? `, ${stat.sub}` : ""}`}
      style={{
        flex: stat.weight ?? 1,
        gap: 2,
        paddingLeft: first ? 0 : spacing.md,
        borderLeftWidth: first ? 0 : 1,
        borderLeftColor: colors.heroRuleSoft,
      }}
    >
      <AppText variant="caption" color="onHeroMuted" numberOfLines={1}>
        {stat.label}
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <AppText
          variant="bodyLg"
          strong
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          color={toneColor(stat.tone)}
          style={{ flexShrink: 1 }}
        >
          {stat.value}
        </AppText>
        {stat.badge ? (
          <View
            style={{
              height: 20,
              paddingHorizontal: 8,
              borderRadius: radius.pill,
              backgroundColor: colors.heroGlass,
              justifyContent: "center",
            }}
          >
            <AppText variant="caption" strong numberOfLines={1} color={toneColor(stat.badge.tone)} style={{ fontSize: 11, lineHeight: 14 }}>
              {stat.badge.text}
            </AppText>
          </View>
        ) : null}
        {stat.aside ? (
          <AppText variant="caption" color="onHeroMuted" numberOfLines={1} style={{ marginLeft: "auto" }}>
            {stat.aside}
          </AppText>
        ) : null}
      </View>
      {stat.meter ? (
        <View style={{ height: 16, justifyContent: "center" }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.heroDivider,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.round(Math.max(0, Math.min(1, stat.meter.fill)) * 100)}%`,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors[toneColor(stat.meter.tone)],
              }}
            />
          </View>
        </View>
      ) : stat.sub ? (
        <AppText variant="caption" color="onHeroMuted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
          {stat.sub}
        </AppText>
      ) : null}
    </View>
  );
}

function Key({ parts }: { parts: HeroRing["parts"] }) {
  const { colors } = useTheme();

  return (
    <View style={{ gap: 4 }}>
      {parts.map((part, index) => (
        <View
          key={part.label}
          accessible
          accessibilityLabel={`${part.label}, ${part.value}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: index === 0 ? colors.onHero : "transparent",
              borderWidth: 1.5,
              borderColor: index === 0 ? colors.onHero : colors.onHeroMuted,
            }}
          />
          <AppText variant="caption" color="onHeroMuted" numberOfLines={1}>
            {part.label}
          </AppText>
          <AppText variant="caption" strong color="onHero" numberOfLines={1}>
            {part.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

// A ring split into the two parts of the headline figure (the first part solid, the second faint), with one figure inside.
function Ring({ ring }: { ring: HeroRing }) {
  const { colors } = useTheme();
  const r = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const first = Math.max(0, Math.min(1, ring.firstShare)) * circumference;

  return (
    <View
      accessible
      accessibilityLabel={`${ring.center} ${ring.caption}`}
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} stroke={colors.heroDivider} strokeWidth={RING_STROKE} fill="none" />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={r}
          stroke={colors.onHero}
          strokeWidth={RING_STROKE}
          fill="none"
          strokeDasharray={`${first} ${circumference}`}
          strokeLinecap="butt"
        />
      </Svg>
      <AppText variant="bodyLg" strong color="onHero" numberOfLines={1}>
        {ring.center}
      </AppText>
      <AppText variant="caption" color="onHeroMuted" numberOfLines={1} style={{ fontSize: 11, lineHeight: 14 }}>
        {ring.caption}
      </AppText>
    </View>
  );
}

export function ModuleHero({ label, value, valueTone, money = true, chips, ring, caption, accessory, stats }: ModuleHeroProps) {
  const { colors, spacing } = useTheme();
  const color = toneColor(valueTone);

  return (
    <View style={{ height: MODULE_HERO_HEIGHT, justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing.sm,
              height: 22,
            }}
          >
            <AppText variant="body" color="onHeroSoft" numberOfLines={1} style={{ flexShrink: 1 }}>
              {label}
            </AppText>
            {accessory}
          </View>
          {money ? (
            <Money value={value} color={color} style={VALUE_STYLE} />
          ) : (
            <AppText variant="display" color={color} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={VALUE_STYLE}>
              {value}
            </AppText>
          )}
          <View
            style={{
              height: DETAIL_ROW,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            {ring ? (
              <Key parts={ring.parts} />
            ) : chips && chips.length > 0 ? (
              chips.slice(0, 2).map((chip) => <Chip key={chip.text} chip={chip} />)
            ) : caption ? (
              <AppText variant="caption" color="onHeroMuted" numberOfLines={1}>
                {caption}
              </AppText>
            ) : null}
          </View>
        </View>
        {ring ? <Ring ring={ring} /> : null}
      </View>
      <View
        style={{
          flexDirection: "row",
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.heroRule,
        }}
      >
        {stats.map((stat, index) => (
          <Stat key={index} stat={stat} first={index === 0} />
        ))}
      </View>
    </View>
  );
}

// Shown while a module's figures load or cannot be read, at the same height, so the header never jumps.
export function ModuleHeroPlaceholder({ label, message }: { label: string; message?: string }) {
  return (
    <ModuleHero
      label={label}
      value="—"
      money={false}
      caption={message}
      stats={[
        { label: " ", value: " " },
        { label: " ", value: " " },
        { label: " ", value: " " },
      ]}
    />
  );
}
