import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { font } from "@/theme/tokens";

import { Icon } from "./ui/icon";

export type HeroStat = { label: string; value: string; tone?: "pos" | "neg" | ""; onPress?: () => void; chevron?: boolean };

/* Module hero (design .hero): label row, the big value (cents lighter, .hero-v .cents), a free slot (actions / chips), then the stats
   row under a hairline. Fills the 180 px hero frame of the module header. */
export function Hero({ label, value, right, under, stats }: { label: string; value: string; right?: ReactNode; under?: ReactNode; stats?: HeroStat[] }) {
  const m = value.match(/^(.*?)(\.\d+)?([KMB%x]?)$/);
  const whole = m ? m[1] : value, cents = m?.[2] ?? "", unit = m?.[3] ?? "";
  return (
    <View style={styles.hero}>
      <View>
        <View style={styles.lr}>
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
          {right}
        </View>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {whole}
          {cents !== "" && <Text style={styles.cents}>{cents}</Text>}
          {unit}
        </Text>
        {under}
      </View>
      {stats && stats.length > 0 && (
        <View style={styles.stats}>
          {stats.map((s, i) => {
            const body = (
              <>
                <View style={styles.sl}>
                  <Text style={styles.statLabel} numberOfLines={1}>{s.label}</Text>
                  {s.chevron && <Icon name="expand_more" size={14} color="#FFFFFF" />}
                </View>
                <Text style={[styles.statValue, s.tone === "pos" && { color: "#32EEE2" }, s.tone === "neg" && { color: "#FF8AC2" }]} numberOfLines={1}>
                  {s.value}
                </Text>
              </>
            );
            const st = [styles.stat, i > 0 && styles.sep];
            return s.onPress ? (
              <Pressable key={s.label} style={st} onPress={s.onPress} accessibilityRole="button" accessibilityLabel={`${s.label} ${s.value}`}>
                {body}
              </Pressable>
            ) : (
              <View key={s.label} style={st}>
                {body}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export const heroText = StyleSheet.create({
  label: { color: "rgba(255,255,255,0.96)", fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  value: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16, lineHeight: 22, fontVariant: ["tabular-nums"] },
});

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: "space-between" },
  lr: { height: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  label: { color: "rgba(255,255,255,0.98)", fontFamily: font.regular, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  value: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 34, lineHeight: 42, letterSpacing: -0.6, fontVariant: ["tabular-nums", "no-contextual"] },
  cents: { color: "rgba(255,255,255,0.8)" },
  stats: { flexDirection: "row", paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.26)" },
  stat: { flex: 1, minWidth: 0, gap: 2 },
  sep: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.28)" },
  sl: { flexDirection: "row", alignItems: "center", gap: 2 },
  statLabel: heroText.label,
  statValue: heroText.value,
});
