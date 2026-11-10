import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { hfFmt, levFmt, nf } from "@/format";
import { MascotFace } from "@/mascot/mascot";
import { DATA } from "@/sample/data";
import { acct, hasMargin, priceRoom } from "@/sample/model";
import { useChain } from "@/state/chain";
import { usePersonal } from "@/state/personal";
import { font } from "@/theme/tokens";
import { openBorrow, openFlash } from "@/screens/margin/sheets";

import { type HeroStat, heroText } from "./hero";
import { IconAction } from "./ui/kit";

/* Borrow & Trade strip, the hero of Spot, Perps and Farm, as V7 draws it (design farmHero: .fm-hm / .fm-hv / .hstats):
   "Health factor", then the face and the number with Borrow more and Flash repay on the right, then Leverage | Room before
   liquidation | the module's figure (widths 0.8 / 1.45 / 1.1). The hero takes its content height (the page uses heroAuto).
   Changes from V7, as agreed: no Watch / Safe badge, and Flash repay is the red button (with a white ring on Farm's pink hero). */
export function AccountStrip({ third, onRed }: { third: HeroStat & { sub?: string }; onRed?: boolean }) {
  const { chain } = useChain();
  const ready = usePersonal(chain);
  const { width } = useWindowDimensions();
  const has = ready && hasMargin(DATA[chain]);
  const a = acct(chain);
  const nd = !(a.debtUsd > 0.005);
  const r = priceRoom(chain);
  const room = !ready ? "—" : r.state === "ok" ? `${(r.pct ?? 0) < 0 ? "−" : "+"}${nf(Math.abs(r.pct ?? 0), 1)}%` : r.state === "now" ? "Now" : "—";
  return (
    <View style={{ gap: 16, paddingBottom: 4 }}>
      <View>
        <Text style={styles.lab}>Health factor</Text>
        <View style={styles.hv}>
          {has && !nd && <MascotFace hf={a.hf} size={40} />}
          <Text style={styles.hf} numberOfLines={1}>{!has ? "—" : nd ? "No debt" : hfFmt(a.hf)}</Text>
          <View style={styles.acts}>
            <IconAction icon="add" label="Borrow more" tone="hero" onPress={() => openBorrow(chain)} />
            <IconAction icon="bolt" label="Flash repay" tone="primary" ring={onRed} gradient={["#FC5457", "#B6479E"]} onPress={() => openFlash(chain)} />
          </View>
        </View>
      </View>
      <View style={styles.stats}>
        <View style={[styles.stat, { flex: 0.8 }]}>
          <Text style={heroText.label} numberOfLines={1}>Leverage</Text>
          <Text style={styles.v}>{has ? levFmt(a.lev) : "—"}</Text>
        </View>
        <View style={[styles.stat, styles.sep, { flex: 1.45 }]}>
          <Text style={heroText.label} numberOfLines={1}>{width < 380 ? "Room" : "Room before liquidation"}</Text>
          <Text style={styles.v}>{room}</Text>
        </View>
        <View style={[styles.stat, styles.sep, { flex: 1.1 }]}>
          <Text style={heroText.label} numberOfLines={1}>{third.label}</Text>
          <Text style={styles.v} numberOfLines={1}>{third.value}</Text>
          {third.sub && <Text style={styles.sub} numberOfLines={1}>{third.sub}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lab: { color: "#FFFFFF", fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  hv: { minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 },
  hf: { flexShrink: 1, color: "#FFFFFF", fontFamily: font.semibold, fontSize: 34, lineHeight: 42, letterSpacing: -0.6, fontVariant: ["tabular-nums"] },
  acts: { marginLeft: "auto", flexDirection: "row", gap: 8 },
  stats: { flexDirection: "row", paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.26)" },
  stat: { minWidth: 0, gap: 2 },
  sep: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.28)" },
  v: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16, lineHeight: 22, fontVariant: ["tabular-nums"] },
  sub: { color: "rgba(255,255,255,0.86)", fontFamily: font.regular, fontSize: 11, lineHeight: 14 },
});
