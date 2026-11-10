import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { useRef, useState } from "react";
import { type HostInstance, Linking, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import Svg, { Path } from "react-native-svg";
import { captureRef } from "react-native-view-shot";

import { Seg2 } from "@/components/form";
import { Icon } from "@/components/ui/icon";
import { levFmt, nf, pct, tokFmt, usd } from "@/format";
import { MascotFace } from "@/mascot/mascot";
import { VannaMark, Wordmark } from "@/components/brand";
import { ACTIVITY, DATA, PX } from "@/sample/data";
import { acct, perpPnl, poolOf, spotPnl } from "@/sample/model";
import { REFERRAL } from "@/sample/rewards";
import { type Chain, CHAIN_LABEL, useChain } from "@/state/chain";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { openSheet, toast } from "@/ui/overlay";

import { SOCIAL } from "./social";

/* Share (design shared/share.js + share-cards.js): the card preview (dark, the Vanna lockup, title, the big number, three figures, the
   face, the referral QR), X 16:9 | Square, share targets, the post text with Copy text, then Copy link / Share image / More.
   Post texts follow the design: first person, one plain line + the referral link, testnet said once, no promises. */
export type ShareKind = "perps" | "spot" | "margin" | "earn" | "farm" | "health" | "liq" | "invite";
export type ShareSpec = { kind: ShareKind; id?: string };

export const openShare = (spec: ShareSpec) => openSheet({ title: "Share", content: () => <ShareSheet spec={spec} /> });

const REF = `vanna.finance/r/${REFERRAL.code}`;
const DATE = "Oct 7, 2026";
const px = (s: string) => PX[s] ?? 0;
const price = (v: number) => usd(v, v >= 1 ? 2 : 4);
const sPct = (v: number, d = 2) => (v >= 0 ? "+" : "−") + nf(Math.abs(v), d) + "%";
const sUsd2 = (v: number) => (v >= 0 ? "+" : "−") + usd(Math.abs(v));
const an = (w: string) => (/^(8|11x|18x|[AEIOX])/i.test(w) ? "an" : "a");
const tryIt = `On testnet now: ${REF}`;
const credit = "with credit from my Vanna account";

type Card = { title: string; big: string; unit?: string; profit: boolean; row: [string, string][]; tag?: string; post: string; hf: number };

function cardOf(chain: Chain, s: ShareSpec): Card | null {
  const d = DATA[chain], a = acct(chain), hf = a.hf;
  switch (s.kind) {
    case "perps": {
      const p = d.perps.find((x) => x.id === s.id);
      if (!p) return null;
      const pl = perpPnl(p), r = (pl / p.coll) * 100, lv = `${p.lev}x`, pos = `${an(lv)} ${lv} ${p.k} ${p.side}`;
      return { title: `${p.k}-PERP ${p.side === "long" ? "Long" : "Short"} ${p.lev}x`, big: sPct(r), profit: pl >= 0, hf, row: [["Entry", price(p.entry)], ["Mark", price(px(p.k))], ["PnL", sUsd2(pl)]],
        post: pl >= 0 ? `Up ${pct(Math.abs(r))} on ${pos}, opened ${credit}. ${tryIt}` : `Down ${pct(Math.abs(r))} on ${pos} on Vanna testnet. Same account, one health factor. ${REF}` };
    }
    case "spot": {
      const p = d.spot.find((x) => x.id === s.id);
      if (!p) return null;
      const pl = spotPnl(p), r = (pl / (p.qty * p.entry)) * 100;
      return { title: `${p.sym} ${p.side === "long" ? "Long" : "Short"}, spot with leverage`, big: sPct(r), profit: pl >= 0, hf, row: [["Entry", price(p.entry)], ["Mark", price(px(p.sym))], ["PnL", sUsd2(pl)]],
        post: pl >= 0 ? `Up ${pct(Math.abs(r))} on ${an(p.sym)} ${p.sym} spot ${p.side}, ${p.side === "long" ? "bought" : "sold"} ${credit}. ${tryIt}` : `Down ${pct(Math.abs(r))} on ${an(p.sym)} ${p.sym} spot ${p.side} on Vanna testnet. Same account, one health factor. ${REF}` };
    }
    case "margin": {
      const mods = [d.spot.length && "spot", d.perps.length && "perps", d.farm.length && "farm"].filter(Boolean) as string[];
      const m = mods.length > 1 ? mods.slice(0, -1).join(", ") + " and " + mods[mods.length - 1] : mods[0] ?? "borrowing";
      return { title: `Margin on ${CHAIN_LABEL[chain]}`, big: sUsd2(a.openPnl), profit: a.openPnl >= 0, hf, row: [["Equity", usd(a.equity)], ["Borrowed", usd(a.debtUsd)], ["Leverage", levFmt(a.lev)]],
        post: a.openPnl >= 0 ? `Up ${usd(Math.abs(a.openPnl))} across ${m}, all on credit from one Vanna account. ${tryIt}` : `Down ${usd(Math.abs(a.openPnl))} across ${m} on Vanna testnet. One account, one health factor. ${REF}` };
    }
    case "earn": {
      const l = d.lend.find((x) => x.sym === s.id);
      if (!l) return null;
      const apy = poolOf(chain, l.sym)?.supA ?? 0;
      return { title: `${l.sym} Earn`, big: "+" + usd(l.earned * px(l.sym)), unit: "earned", profit: true, hf, row: [["APY", pct(apy)], ["Supplied", tokFmt(l.amt, l.sym)], ["Since", l.since]],
        post: `Earning ${pct(apy)} on ${l.sym} by lending to traders on Vanna testnet. ${REF}` };
    }
    case "farm": {
      const f = d.farm.find((x) => x.id === s.id);
      if (!f) return null;
      const e = f.earned * px(f.sym), venue = f.venue.split(/\s+and\s+/)[0];
      return { title: f.kind === "lend" ? `${venue} ${f.name.replace(/\s*Lending$/, "")} Farm` : `${f.name} vault`, big: sUsd2(e), profit: e >= 0, hf, row: [["APY", pct(f.apy)], ["Deposited", usd(f.amt * px(f.sym))], ["Since", f.since]],
        post: `Earning ${pct(f.apy)} ${f.kind === "lend" ? `on ${f.sym} in ${venue}` : `in the ${f.name} vault`}, funded ${credit}. ${tryIt}` };
    }
    case "health":
      return { title: "Health factor", big: nf(hf, 2), profit: true, hf, tag: hf >= 1.5 ? "Safe" : "Watch", row: [["Liquidation at", "1.10"], ["Borrowed", usd(a.debtUsd)], ["Leverage", levFmt(a.lev)]],
        post: `Spot, perps and farm on one account, one health factor: ${nf(hf, 2)}. ${tryIt}` };
    case "liq": {
      const r = ACTIVITY[chain].find((x) => x.tx === s.id && x.action === "Liquidated");
      if (!r) return null;
      const m = r.detail.match(/^(\S+) (long|short) ([\d.]+)x/i), ttl = m ? `${m[1]} ${m[2]} ${m[3]}x` : "Position";
      return { title: `${ttl}, liquidated`, big: "−" + usd(Math.abs(r.usd ?? 0)), profit: false, hf: 1.05, row: [["Date", r.t.split(",")[0]]],
        post: `Got liquidated on ${m ? `${an(m[3] + "x")} ${m[3]}x ${m[1]} ${m[2]}` : "a position"} on Vanna testnet. Lesson learned. ${REF}` };
    }
    case "invite":
      return { title: "Join me on Vanna", big: REFERRAL.code, unit: "my code", profit: true, hf: 2, row: [["Lend", "Earn"], ["Borrow", "Trade"], ["One", "Account"]],
        post: `I'm testing Vanna: lend, borrow and trade from one account. Skip the waitlist with my code ${REFERRAL.code}. ${REF}` };
  }
}

const TARGETS: [keyof typeof SOCIAL, string, (t: string, u: string) => string][] = [
  ["x", "X", (t) => `https://x.com/intent/post?text=${encodeURIComponent(t)}`],
  ["linkedin", "LinkedIn", (_t, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`],
  ["facebook", "Facebook", (_t, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`],
  ["telegram", "Telegram", (t, u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`],
  ["whatsapp", "WhatsApp", (t) => `https://wa.me/?text=${encodeURIComponent(t)}`],
  ["reddit", "Reddit", (t, u) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`],
  ["instagram", "Instagram", () => "instagram://app"],
];

function ShareSheet({ spec }: { spec: ShareSpec }) {
  const { colors } = useTheme();
  const { chain } = useChain();
  const [fmt, setFmt] = useState<"x" | "sq">("x");
  const shot = useRef<HostInstance>(null);
  const c = cardOf(chain, spec);
  if (!c) return <Text style={{ color: colors.muted, fontFamily: font.regular, paddingBottom: 16 }}>This is no longer open.</Text>;
  const url = `https://${REF}`;

  const image = async () => {
    try {
      const uri = await captureRef(shot, { format: "png", quality: 1, result: "tmpfile" });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share card" });
      else toast("Sharing images isn't available here");
    } catch {
      toast("Couldn't make the image");
    }
  };
  const target = async (k: keyof typeof SOCIAL, link: string) => {
    if (k === "instagram") {
      await Clipboard.setStringAsync(c.post).catch(() => {});
      toast("Post text copied. Add the image in Instagram");
      image();
      return;
    }
    Linking.openURL(link).catch(() => toast("Couldn't open the app"));
  };

  return (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      <View ref={shot} collapsable={false} style={[styles.card, fmt === "x" ? { aspectRatio: 16 / 9 } : { aspectRatio: 1 }]}>
        <LinearGradient colors={["#1A1420", "#120F16"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={[c.profit ? "rgba(112,58,230,0.32)" : "rgba(252,84,87,0.30)", "rgba(0,0,0,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.7 }} style={StyleSheet.absoluteFill} />
        <View style={[styles.cIn, fmt === "sq" && { justifyContent: "space-between" }]}>
          <View style={styles.lock}>
            <VannaMark size={14} />
            <Wordmark height={11} />
          </View>
          <View style={{ flexDirection: fmt === "x" ? "row" : "column", flex: 1, alignItems: fmt === "x" ? "center" : "stretch", gap: 8 }}>
            <View style={{ flex: 1, justifyContent: "center", gap: 2 }}>
              <Text style={styles.cT} numberOfLines={1}>{c.title}</Text>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                <Text style={[styles.cBig, { color: c.profit ? "#FF8AB8" : "#FC5457" }]} numberOfLines={1}>{c.big}</Text>
                {c.unit && <Text style={styles.cU}>{c.unit}</Text>}
              </View>
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {c.row.map(([l, v]) => (
                  <Text key={l} style={styles.cR}>
                    {l} <Text style={{ fontFamily: font.semibold, color: "#FFFFFF" }}>{v}</Text>
                  </Text>
                ))}
              </View>
              {c.tag && (
                <View style={styles.cTag}>
                  <Text style={styles.cTagT}>{c.tag}</Text>
                </View>
              )}
            </View>
            <View style={[styles.face, fmt === "sq" && { alignSelf: "center", width: 120, height: 120, borderRadius: 60 }]}>
              <MascotFace hf={c.profit ? Math.max(c.hf, 1.6) : 1.05} size={fmt === "sq" ? 104 : 76} />
            </View>
          </View>
          <View style={styles.qrRow}>
            <View style={styles.qr}>
              <QRCode value={`https://${REF}`} size={34} backgroundColor="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.qrS}>Scan or tap to join</Text>
              <Text style={styles.qrL}>{REF}</Text>
              <Text style={styles.qrD}>{DATE} Testnet, test funds</Text>
            </View>
          </View>
        </View>
      </View>

      <Seg2 items={[["x", "X 16:9"], ["sq", "Square"]]} value={fmt} onChange={setFmt} label="Card format" full />

      <View style={styles.grid}>
        {TARGETS.map(([k, l, mk]) => (
          <Pressable key={k} onPress={() => target(k, mk(c.post, url))} style={styles.tg} accessibilityRole="button" accessibilityLabel={`Share to ${l}`}>
            <View style={[styles.tgI, { backgroundColor: colors.segment }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24">
                <Path d={SOCIAL[k]} fill={colors.text} />
              </Svg>
            </View>
            <Text style={[styles.tgT, { color: colors.text }]}>{l}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => Share.share(Platform.OS === "ios" ? { message: c.post, url } : { message: c.post })} style={styles.tg} accessibilityRole="button" accessibilityLabel="More apps">
          <View style={[styles.tgI, { backgroundColor: colors.segment }]}>
            <Icon name="more_horiz" size={22} />
          </View>
          <Text style={[styles.tgT, { color: colors.text }]}>More</Text>
        </Pressable>
      </View>

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.ph, { color: colors.text, flex: 1 }]}>Post text</Text>
          <Pressable onPress={() => (Clipboard.setStringAsync(c.post).catch(() => {}), toast("Post text copied"))} hitSlop={8} style={styles.ct} accessibilityRole="button">
            <Icon name="content_copy" size={16} color="link" />
            <Text style={[styles.ph, { color: colors.link }]}>Copy text</Text>
          </Pressable>
        </View>
        <View style={[styles.post, { backgroundColor: colors.bg }]}>
          <Text style={[styles.postT, { color: colors.text }]}>{c.post}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Foot icon="link" label="Copy link" onPress={() => (Clipboard.setStringAsync(url).catch(() => {}), toast("Link copied"))} />
        <Foot icon="image" label="Share image" onPress={image} />
      </View>
    </View>
  );
}

function Foot({ icon, label, onPress }: { icon: "link" | "image"; label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.foot, { borderColor: colors.borderControl }]} accessibilityRole="button">
      <Icon name={icon} size={18} />
      <Text style={[styles.ph, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  cIn: { flex: 1, padding: 16, gap: 6 },
  lock: { flexDirection: "row", alignItems: "center", gap: 5 },
  cT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 13, lineHeight: 18 },
  cBig: { fontFamily: font.semibold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5, fontVariant: ["tabular-nums"] },
  cU: { color: "rgba(255,255,255,0.8)", fontFamily: font.regular, fontSize: 11 },
  cR: { color: "rgba(255,255,255,0.75)", fontFamily: font.regular, fontSize: 9, lineHeight: 13 },
  cTag: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 6, height: 16, borderRadius: 8, backgroundColor: "#6B0033", justifyContent: "center" },
  cTagT: { color: "#FFB0D6", fontFamily: font.semibold, fontSize: 9 },
  face: { width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  qrRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qr: { padding: 3, backgroundColor: "#FFFFFF", borderRadius: 4 },
  qrS: { color: "rgba(255,255,255,0.7)", fontFamily: font.regular, fontSize: 7 },
  qrL: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 8 },
  qrD: { color: "rgba(255,255,255,0.5)", fontFamily: font.regular, fontSize: 7 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  tg: { width: "25%", alignItems: "center", gap: 6 },
  tgI: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  tgT: { fontFamily: font.regular, fontSize: 13 },
  ph: { fontFamily: font.semibold, fontSize: 14 },
  ct: { flexDirection: "row", alignItems: "center", gap: 4 },
  post: { borderRadius: 12, padding: 12 },
  postT: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  foot: { flex: 1, height: 44, borderRadius: 22, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
});
