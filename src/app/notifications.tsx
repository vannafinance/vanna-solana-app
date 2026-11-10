import { type Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition } from "react-native-reanimated";

import { TokenLogo, VannaMark } from "@/components/brand";
import { PillTabs, Swap } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { Card, IconAction } from "@/components/ui/kit";
import { MascotBody } from "@/mascot/mascot";
import type { Note } from "@/sample/data";
import { useChain } from "@/state/chain";
import { markRead, useNotes } from "@/state/notes";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { AfterTransition } from "@/ui/ready";

/* Notifications (design screens/notifications.js): Mark all read, filter pills, Today / Earlier cards; one line per note that opens in
   place with its message and one action. Empty = the sleeping chameleon. */
type F = "all" | Note["cat"];
const FILTERS: [F, string][] = [["all", "All"], ["health", "Health"], ["trades", "Trades"], ["earn", "Earn"], ["predict", "Predict"], ["rewards", "Rewards"]];
const isToday = (t: string) => /^(now|\d+\s?[smh])$/i.test(t.trim());

const BADGE: Record<Note["badge"], { icon: IconName; bg: string }> = {
  warning: { icon: "warning", bg: "#FF8AC2" },
  gain: { icon: "trending_up", bg: "#1C7C83" },
  earned: { icon: "toll", bg: "#1C7C83" },
  opened: { icon: "add", bg: "#703AE6" },
  safe: { icon: "check", bg: "#1C7C83" },
};

// One inline action per note (design ACTIONS / BY_CAT), routed to the screens that exist so far.
function actionOf(n: Note): [string, () => void] | null {
  switch (n.cat) {
    case "health":
      return ["Add collateral", () => router.navigate("/margin")];
    case "trades":
      return ["View positions", () => router.navigate("/trade")];
    case "earn":
      return ["View vault", () => router.navigate("/lend")];
    case "predict":
      return ["View market", () => router.navigate("/lend/market/lal-bar-osa?m=bar" as Href)];
    case "rewards":
      return ["See points", () => router.push("/rewards" as Href)];
  }
}

export default function Notifications() {
  const { colors } = useTheme();
  const { chain } = useChain();
  const notes = useNotes(chain);
  const [f, setF] = useState<F>("all");
  const [open, setOpen] = useState<string | null>(null);
  const filters = FILTERS.filter(([k]) => k !== "predict" || chain === "solana");
  const list = notes.filter((n) => f === "all" || n.cat === f);
  const groups = ([["Today", list.filter((n) => isToday(n.time))], ["Earlier", list.filter((n) => !isToday(n.time))]] as [string, Note[]][]).filter((g) => g[1].length);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title="Notifications" trail={<IconAction icon="done_all" label="Mark all read" tone="plain" onPress={() => markRead()} />} />
      <AfterTransition>
      <ScrollView contentContainerStyle={styles.body}>
        <PillTabs items={filters} value={filters.some(([k]) => k === f) ? f : "all"} onChange={setF} color="#703AE6" />
        <Swap k={f}>
          {!list.length ? (
            <View style={styles.empty}>
              <MascotBody width={112} asleep />
              <Text style={[styles.emptyT, { color: colors.text }]}>You&apos;re all caught up</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {groups.map(([g, items]) => (
                <Card key={g} style={{ paddingVertical: 8, gap: 0 }}>
                  <Text style={[styles.gl, { color: colors.muted }]}>{g}</Text>
                  {items.map((n) => (
                    <Row key={n.id} n={n} open={open === n.id} onPress={() => {
                      markRead(n.id);
                      setOpen(open === n.id ? null : n.id);
                    }} />
                  ))}
                </Card>
              ))}
            </View>
          )}
        </Swap>
      </ScrollView>
      </AfterTransition>
    </View>
  );
}

function Row({ n, open, onPress }: { n: Note; open: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const act = actionOf(n);
  const b = BADGE[n.badge];
  return (
    <Animated.View layout={LinearTransition.duration(200)}>
      <Pressable onPress={onPress} style={styles.row} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={n.title}>
        <View style={styles.av}>
          {n.icon === "vanna" ? (
            <View style={[styles.vn, { backgroundColor: colors.purpleTint }]}>
              <VannaMark size={24} />
            </View>
          ) : (
            <TokenLogo sym={n.icon} size={40} />
          )}
          <View style={[styles.badge, { backgroundColor: b.bg, borderColor: colors.surface }]}>
            <Icon name={b.icon} size={11} color="#FFFFFF" />
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <View style={styles.tr}>
            <Text style={[styles.t, { color: colors.text }]} numberOfLines={open ? undefined : 1}>
              {n.title}
            </Text>
            <Text style={[styles.tm, { color: colors.muted }]}>{n.time}</Text>
            {n.unread && <View style={styles.dot} accessibilityLabel="Unread" />}
            <Icon name={open ? "expand_less" : "expand_more"} size={20} color="muted" />
          </View>
          {open && (
            <Animated.View entering={FadeIn.duration(150)} style={{ gap: 10 }}>
              <Text style={[styles.msg, { color: colors.muted }]}>{n.msg}</Text>
              {act && (
                <Pressable onPress={act[1]} style={[styles.act, { borderColor: colors.borderControl }]} accessibilityRole="button">
                  <Text style={{ fontFamily: font.semibold, fontSize: 13, color: colors.text }}>{act[0]}</Text>
                </Pressable>
              )}
            </Animated.View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 32 },
  gl: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16, marginTop: 8, marginBottom: 4 },
  row: { flexDirection: "row", gap: 12, paddingVertical: 10 },
  av: { width: 40, height: 40 },
  vn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  badge: { position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  tr: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 24 },
  t: { flex: 1, fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  tm: { fontFamily: font.regular, fontSize: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF007A" },
  msg: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  act: { alignSelf: "flex-start", height: 32, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, justifyContent: "center" },
  empty: { alignItems: "center", gap: 12, paddingVertical: 48 },
  emptyT: { fontFamily: font.semibold, fontSize: 18 },
});
