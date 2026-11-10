import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import { type HostInstance, Platform, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { captureRef } from "react-native-view-shot";

import * as dynamic from "@/chain/dynamic";
import { Seg2 } from "@/components/form";
import { Button } from "@/components/ui/button";
import { shareIcon } from "@/components/ui/kit";
import { levFmt, nf, pct, tokFmt, usd } from "@/format";
import { MascotFace } from "@/mascot/mascot";
import { VannaMark, Wordmark } from "@/components/brand";
import { ACTIVITY, DATA, PX } from "@/sample/data";
import { acct, perpPnl, poolOf, spotPnl } from "@/sample/model";
import { type Chain, CHAIN_LABEL, useChain } from "@/state/chain";
import { families, font } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import { openSheet, toast } from "@/ui/overlay";

/* Share (design/share-menu.html): the card, Wide or Square, the post that goes with it, then one Share button that opens the phone's own
   menu with the image and post already attached. No app icons here: the phone already lists them, and links to each app could only send text.
   Post texts: first person, one plain line + the link, testnet said once, no promises. */
export type ShareKind = "perps" | "spot" | "margin" | "earn" | "farm" | "health" | "liq" | "invite";
export type ShareSpec = { kind: ShareKind; id?: string };

const TITLE: Record<ShareKind, string> = { perps: "Share position", spot: "Share position", earn: "Share position", farm: "Share position", liq: "Share position", margin: "Share account", health: "Share health factor", invite: "Invite a friend" };
export const openShare = (spec: ShareSpec) => openSheet({ title: TITLE[spec.kind], content: () => <ShareSheet spec={spec} /> });

const REF = "test.vanna.finance";
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
      return { title: "Health factor", big: isFinite(hf) ? nf(hf, 2) : "No debt", profit: true, hf, tag: !isFinite(hf) ? undefined : hf >= 1.5 ? "Safe" : "Watch", row: [["Liquidation at", "1.10"], ["Borrowed", usd(a.debtUsd)], ["Leverage", levFmt(a.lev)]],
        post: `Spot, perps and farm on one account, one health factor${isFinite(hf) ? `: ${nf(hf, 2)}` : ""}. ${tryIt}` };
    case "liq": {
      const r = ACTIVITY[chain].find((x) => x.tx === s.id && x.action === "Liquidated");
      if (!r) return null;
      const m = r.detail.match(/^(\S+) (long|short) ([\d.]+)x/i), ttl = m ? `${m[1]} ${m[2]} ${m[3]}x` : "Position";
      return { title: `${ttl}, liquidated`, big: "−" + usd(Math.abs(r.usd ?? 0)), profit: false, hf: 1.05, row: [["Date", r.t.split(",")[0]]],
        post: `Got liquidated on ${m ? `${an(m[3] + "x")} ${m[3]}x ${m[1]} ${m[2]}` : "a position"} on Vanna testnet. Lesson learned. ${REF}` };
    }
    case "invite":
      return { title: "Join me on Vanna", big: "Try Vanna", profit: true, hf: 2, row: [["Lend", "Earn"], ["Borrow", "Trade"], ["One", "Account"]],
        post: `I'm testing Vanna: lend, borrow and trade from one account. ${REF}` };
  }
}

const GROUND = {
  portfolio: { c: ["#FC5457", "#703AE6", "#2F1B61"], end: { x: 1, y: 0.85 } },
  loss: { c: ["#B33C3E", "#5C1D26", "#23121A"], end: { x: 1, y: 0.85 } },
  earn: { c: ["#1C7C83", "#155F64", "#0E4A4E"], end: { x: 0.45, y: 1 } },
  margin: { c: ["#B6479E", "#8E3784", "#6B2766"], end: { x: 0.45, y: 1 } },
  farm: { c: ["#E8006F", "#B50057", "#8C0043"], end: { x: 0.45, y: 1 } },
} as const;
const groundOf = (k: ShareKind, profit: boolean): keyof typeof GROUND => (!profit ? "loss" : k === "earn" ? "earn" : k === "farm" ? "farm" : k === "margin" || k === "health" ? "margin" : "portfolio");
// A loss looks worried; only a liquidation (at or below 1.10) has no face, as everywhere else in the app.
const faceHf = (k: ShareKind, c: Card) => (k === "liq" ? 1.05 : !c.profit ? 1.2 : isFinite(c.hf) ? Math.max(c.hf, 1.6) : 2.4);

function ShareSheet({ spec }: { spec: ShareSpec }) {
  const { colors } = useTheme();
  const { chain } = useChain();
  const [fmt, setFmt] = useState<"wide" | "sq">("wide");
  const [done, setDone] = useState<"copy" | "save" | null>(null);
  const shot = useRef<HostInstance>(null);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const c = cardOf(chain, spec);
  if (!c) return <Text style={{ color: colors.muted, fontFamily: font.regular, paddingBottom: 16 }}>This is no longer open.</Text>;
  const url = `https://${REF}`;
  const g = GROUND[groundOf(spec.kind, c.profit)];
  const sq = fmt === "sq";
  const unit = c.unit ?? c.tag;
  // e.g. vanna-sol-perp-long-5x.png
  const fileName = `vanna-${c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.png`;

  const flash = (k: "copy" | "save") => {
    setDone(k);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(null), 1500);
  };
  const snap = () => captureRef(shot, { format: "png", quality: 1, result: "tmpfile" });
  // A second tap while the image is being made must not open the menu twice.
  const once = async (work: () => Promise<void>, failed: string) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await work();
    } catch {
      toast(failed);
    } finally {
      busy.current = false;
    }
  };
  const share = () =>
    once(async () => {
      const uri = await snap();
      if (Platform.OS === "ios") {
        await Share.share({ url: uri, message: c.post });
        return;
      }
      if (await dynamic.shareImage(uri, c.post, fileName)) return;
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share card" });
      else await Share.share({ message: c.post });
    }, "Couldn't make the image");
  const save = () =>
    once(async () => {
      const uri = await snap();
      if (Platform.OS === "ios") {
        await Share.share({ url: uri }); // the menu's Save Image
        return;
      }
      if (await dynamic.saveImage(uri, fileName)) flash("save");
      else toast("Saving isn't available on this phone");
    }, "Couldn't save the image");

  return (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <View style={[styles.frame, sq && styles.frameSq]}>
        {/* Square corners in the image itself: apps would fill rounded ones with black. */}
        <View ref={shot} collapsable={false} style={{ aspectRatio: sq ? 1 : 16 / 9.4 }}>
          <LinearGradient colors={g.c} locations={[0, 0.48, 1]} start={{ x: 0, y: 0 }} end={g.end} style={StyleSheet.absoluteFill} />
          <View style={[styles.cIn, sq && { padding: 18 }]}>
            <View style={styles.lock}>
              <VannaMark size={16} tone="white" />
              <Wordmark height={12} />
              <View style={styles.net}>
                <Text style={styles.netT}>Testnet</Text>
              </View>
            </View>
            <View style={[styles.mid, sq && { flexDirection: "column", paddingTop: 14 }]}>
              <View style={[{ minWidth: 0, justifyContent: "center" }, !sq && { flex: 1 }]}>
                <Text style={[styles.cT, sq && { fontSize: 16, lineHeight: 22 }]} numberOfLines={1}>{c.title}</Text>
                <View style={styles.bigRow}>
                  <Text style={[styles.cBig, sq && styles.cBigSq, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{c.big}</Text>
                  {unit && <Text style={styles.cU}>{unit}</Text>}
                </View>
                <View style={[styles.figs, sq && { gap: 20, marginTop: 10 }]}>
                  {c.row.map(([l, v]) => (
                    <View key={l} style={{ flexShrink: 1 }}>
                      <Text style={[styles.figL, sq && { fontSize: 12, lineHeight: 16 }]} numberOfLines={1}>{l}</Text>
                      <Text style={[styles.figV, sq && { fontSize: 14, lineHeight: 19 }]} numberOfLines={1}>{v}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={[styles.side, sq && styles.sideSq]}>
                <View style={[styles.face, sq && { width: 72, height: 72, borderRadius: 36 }]}>
                  <MascotFace hf={faceHf(spec.kind, c)} size={sq ? 72 : 58} idle={false} />
                </View>
                <View style={styles.qr}>
                  <QRCode value={url} size={sq ? 62 : 48} backgroundColor="#FFFFFF" />
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>

      <Seg2 items={[["wide", "Wide"], ["sq", "Square"]]} value={fmt} onChange={setFmt} label="Card shape" full />

      <View style={{ gap: 4 }}>
        <Text style={[styles.ph, { color: colors.muted }]}>Goes with the image</Text>
        <Text style={[styles.postT, { color: colors.text }]} selectable>{c.post}</Text>
      </View>

      <View style={{ gap: 8 }}>
        <Button label="Share" icon={shareIcon} fam={families.portfolio} onPress={share} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Button
            label={done === "copy" ? "Copied" : "Copy link"}
            icon={done === "copy" ? "check" : "link"}
            v="outline"
            size="md"
            style={{ flex: 1 }}
            onPress={() => (Clipboard.setStringAsync(url).catch(() => {}), flash("copy"))}
          />
          <Button
            label={done === "save" ? "Saved" : Platform.OS === "ios" ? "Save to Photos" : "Save to gallery"}
            icon={done === "save" ? "check" : "download"}
            v="outline"
            size="md"
            style={{ flex: 1 }}
            onPress={save}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", borderRadius: 18, overflow: "hidden" },
  frameSq: { maxWidth: 292, alignSelf: "center" },
  cIn: { flex: 1, paddingVertical: 14, paddingHorizontal: 15 },
  lock: { flexDirection: "row", alignItems: "center", gap: 6, height: 18 },
  net: { marginLeft: "auto", paddingHorizontal: 7, height: 16, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center" },
  netT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 11, lineHeight: 16 },
  mid: { flex: 1, flexDirection: "row", gap: 10, minHeight: 0, paddingTop: 8 },
  cT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 14, lineHeight: 19 },
  bigRow: { flexDirection: "row", alignItems: "baseline", gap: 5 },
  cBig: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 44, lineHeight: 50, letterSpacing: -1.4, fontVariant: ["tabular-nums"] },
  cBigSq: { fontSize: 60, lineHeight: 68, letterSpacing: -2 },
  cU: { color: "rgba(255,255,255,0.9)", fontFamily: font.semibold, fontSize: 15 },
  figs: { flexDirection: "row", gap: 14, marginTop: 5 },
  figL: { color: "rgba(255,255,255,0.82)", fontFamily: font.regular, fontSize: 11, lineHeight: 14 },
  figV: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 13, lineHeight: 17, fontVariant: ["tabular-nums"] },
  side: { width: 68, alignItems: "center", justifyContent: "space-between" },
  sideSq: { flex: 1, width: "100%", flexDirection: "row", alignItems: "flex-end" },
  face: { width: 58, height: 58, borderRadius: 29, backgroundColor: "rgba(255,255,255,0.16)", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  qr: { padding: 4, backgroundColor: "#FFFFFF", borderRadius: 7 },
  ph: { fontFamily: font.semibold, fontSize: 13, lineHeight: 18 },
  postT: { fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
});
