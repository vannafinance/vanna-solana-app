import { type Href, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { POINTS } from "@/sample/data";
import { useRewards } from "@/sample/rewards";
import { useChain } from "@/state/chain";
import { useNotes } from "@/state/notes";
import { BRAND_GRADIENT, type Family, font } from "@/theme/tokens";

import { BrandLockup, CHAIN_LOGO, TokenLogo } from "./brand";
import { initialOf } from "./avatar";
import { HeroSurface } from "./hero-surface";
import { Icon } from "./ui/icon";

const ptsShort = (n: number) => (n >= 1000 ? (Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, "") + "K" : String(n));

/* The module header (design core.js .mh): the family's surface, the header row (brand, Copilot, points, bell, avatar), then the
   module's hero in a 234 px body whose last 48 px sit under the page pill. heroHeight = null lets the hero take its own height. */
export function ModuleHeader({ fam, children, heroHeight = 234 }: { fam: Family; children?: ReactNode; heroHeight?: number | null }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.mh}>
      <HeroSurface fam={fam} />
      <View style={{ paddingTop: insets.top, paddingHorizontal: 12 }}>
        <HeaderRow />
      </View>
      {children != null && <View style={[styles.body, heroHeight != null ? { height: heroHeight } : { paddingBottom: 48 }]}>{children}</View>}
    </View>
  );
}

export function HeaderRow() {
  const { chain } = useChain();
  const unread = useNotes(chain).filter((n) => n.unread).length;
  const cp = useRewards();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <BrandLockup />
      </View>
      <Pressable style={styles.hbtn} onPress={() => router.push("/copilot" as Href)} accessibilityRole="button" accessibilityLabel={`Copilot${cp.cpView === "unlocked" ? "" : ", locked"}`}>
        <Icon name="auto_awesome" size={24} color="#FFFFFF" />
        {cp.cpView !== "unlocked" && (
          <View style={styles.lock}>
            <Icon name="lock" size={10} color="#2F1B61" filled />
          </View>
        )}
      </Pressable>
      <Pressable style={styles.pts} onPress={() => router.push("/rewards" as Href)} accessibilityRole="button" accessibilityLabel={`Rewards, ${POINTS.toLocaleString("en-US")} points`}>
        <Icon name="stars" size={16} color="#FFD66B" filled />
        <Text style={styles.ptsText}>{ptsShort(POINTS)}</Text>
      </Pressable>
      <Pressable style={styles.hbtn} onPress={() => router.push("/notifications")} accessibilityRole="button" accessibilityLabel={`Notifications${unread ? `, ${unread} unread` : ""}`}>
        <Icon name="notifications" size={24} color="#FFFFFF" />
        {unread > 0 && (
          <View style={styles.count}>
            <Text style={styles.countText}>{unread}</Text>
          </View>
        )}
      </Pressable>
      <Pressable style={styles.av} onPress={() => router.push("/account")} accessibilityRole="button" accessibilityLabel={`Account, ${chain === "solana" ? "Solana" : "Stellar"}`}>
        <View style={styles.ring}>
          <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.face}>
            <Text style={styles.faceText}>{initialOf(cp.name)}</Text>
          </LinearGradient>
        </View>
        <View style={styles.chb}>
          <TokenLogo sym={CHAIN_LOGO[chain]} size={14} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  mh: { overflow: "hidden", borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  row: { height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  body: { paddingTop: 6, paddingHorizontal: 16, paddingBottom: 48 },
  hbtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", marginRight: 8 },
  lock: {
    position: "absolute", right: 5, bottom: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  pts: { flexDirection: "row", alignItems: "center", gap: 4, height: 32, paddingLeft: 8, paddingRight: 10, marginRight: 4, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.16)" },
  ptsText: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 13, lineHeight: 16 },
  count: { position: "absolute", top: 4, right: 2, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: "#FF007A", alignItems: "center", justifyContent: "center" },
  countText: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 11, lineHeight: 18 },
  av: { width: 44, height: 44 },
  ring: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: 22, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.34)", overflow: "hidden" },
  face: { flex: 1, alignItems: "center", justifyContent: "center" },
  faceText: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 17 },
  chb: { position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "#FFFFFF", overflow: "hidden", alignItems: "center", justifyContent: "center" },
});
