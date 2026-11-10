import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { GATE, MODULES, UNLOCK } from "@/sample/rewards";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

// Shared by Rewards and Copilot: the small tinted label (design tag) and the Copilot unlock checklist.
export function Pill({ label, tone, icon, style }: { label: string; tone: "purple" | "teal" | "grey" | "pink"; icon?: ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  const look = { purple: [colors.purpleTint, colors.onPurpleTint], teal: [colors.tealTint, colors.onTealTint], grey: [colors.segment, colors.muted], pink: [colors.pinkTint, colors.onPinkTint] }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: look[0] }, style]}>
      {icon}
      <Text style={[styles.pillT, { color: look[1] }]}>{label}</Text>
    </View>
  );
}

// The unlock checklist (design GateAPI.progress): email and wallet, account age, modules used (with chips), active days, points.
export function GateList({ compact }: { compact?: boolean }) {
  const { colors } = useTheme();
  const used = GATE.used.length;
  const rows: { l: string; v: string; ok: boolean; chips?: boolean }[] = [
    { l: "Email and wallet", v: "Done", ok: true },
    { l: "Account age", v: `${GATE.age} days`, ok: GATE.age >= UNLOCK.ageDays },
    { l: "Modules used", v: `${used} of ${UNLOCK.modules}`, ok: used >= UNLOCK.modules, chips: true },
    { l: "Active days", v: `${GATE.active} of ${UNLOCK.activeDays}`, ok: GATE.active >= UNLOCK.activeDays },
    { l: "Points", v: "Reached", ok: true },
  ];
  return (
    <View style={[styles.gate, { backgroundColor: compact ? "transparent" : colors.bg, paddingHorizontal: compact ? 0 : 12 }]}>
      {rows.map((r, i) => (
        <View key={r.l} style={[{ paddingVertical: 12, gap: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
          <View style={styles.gr}>
            {r.ok ? (
              <View style={styles.gok}>
                <Icon name="check" size={16} color="#111111" bold />
              </View>
            ) : (
              <View style={[styles.gno, { borderColor: colors.borderControl }]} />
            )}
            <Text style={[styles.body15, { color: colors.text, flex: 1 }]}>{r.l}</Text>
            <Text style={[styles.capB, { color: r.ok ? colors.positive : colors.text, fontSize: 14 }]}>{r.v}</Text>
          </View>
          {r.chips && (
            <View style={styles.mchips}>
              {MODULES.map(([k, l]) => {
                const on = GATE.used.includes(k);
                return (
                  <View key={k} style={[styles.mchip, { backgroundColor: on ? colors.tealTint : colors.segment }]}>
                    {on ? <Icon name="check" size={14} color={colors.onTealTint} /> : <Icon name="radio_button_unchecked" size={11} color="muted" />}
                    <Text style={[styles.mchipT, { color: on ? colors.onTealTint : colors.text }]}>{l}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 22, paddingHorizontal: 8, borderRadius: 8, alignSelf: "flex-start" },
  pillT: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  gate: { borderRadius: 12 },
  gr: { flexDirection: "row", alignItems: "center", gap: 12 },
  gok: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#32EEE2", alignItems: "center", justifyContent: "center" },
  gno: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5 },
  body15: { fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  capB: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  mchips: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingLeft: 36 },
  mchip: { flexDirection: "row", alignItems: "center", gap: 4, height: 26, paddingHorizontal: 9, borderRadius: 13 },
  mchipT: { fontFamily: font.semibold, fontSize: 12 },
});
