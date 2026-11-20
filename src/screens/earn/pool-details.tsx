import * as Clipboard from "expo-clipboard";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { SOLANA_RPC } from "@/chain/solana/config";
import { ASSET_RISK } from "@/chain/solana/risk";
import { TokenLogo } from "@/components/brand";
import { ActionTag, openTx } from "@/components/history";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard } from "@/components/ui/kit";
import { nf, pct, usd } from "@/format";
import type { Activity, Pool } from "@/sample/data";
import { useWallets } from "@/state/wallets";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { toast } from "@/ui/overlay";

import { addrsOf, fL, freeTok, fXr, px, shareSym, shortAddr } from "./model";

/* Lend pool Details and Activity tabs (design/lend-pool details() / activity(), website earn-pool-tabs.tsx). Details: Statistics (two
   ring gauges and the pool's figures), Oracle, Limits and Contracts, with short labels and no tips. Activity: the person's Supply /
   Withdraw transactions for this pool with date, type, amount, status and the transaction hash. */
const D = "—";
const explorerAddr = (a: string) => `https://explorer.solana.com/address/${a}?cluster=custom&customUrl=${encodeURIComponent(SOLANA_RPC)}`;
const openUrl = (url: string) => Linking.openURL(url).catch(() => toast("Couldn't open the explorer"));
// up to 6 digits, no trailing zeros (website wadStr): 3.5, 0.01
const trim = (n: number) => String(Number(n.toFixed(6)));
type Fig = [label: string, value: string, sub?: string];

export function PoolDetails({ p }: { p: Pool }) {
  const { colors } = useTheme();
  const s = p.sym, live = !!p.live, risk = ASSET_RISK[s], price = px(s);
  const util = Math.max(0, Math.min(100, p.util)), supPct = p.sup > 0 ? 100 - util : 0;
  const u = (n: number) => "$" + fL(n * price);
  const avail = p.avail ?? freeTok(p);
  const cap = (c: number | null | undefined, used: number): [string, string?] =>
    !live || c === undefined ? [D] : c === null ? ["Uncapped"] : [`${fL(c)} ${s}`, `${Math.min(100, c > 0 ? (used / c) * 100 : 0).toFixed(2)}% used`];
  const stats: Fig[] = live
    ? [
        ["Available liquidity", `${fL(avail)} ${s}`, u(avail)],
        ["Supply APY", pct(p.supA), `${fL(p.sup)} ${s}`],
        ["Borrow APY", pct(p.borA)],
        ["Utilization", pct(p.util)],
        ["Liquidation bonus", risk ? pct(risk.liqBonus) : D, "Liquidatable at HF 1.10 or below"],
        ["Reserve factor", p.rf !== undefined ? pct(p.rf) : D],
        ["Status", p.status ?? D],
        ["Rate curve", p.curve ? `×${trim(p.curve.m)}` : D, p.curve ? `linear ${trim(p.curve.l)} · jump ${trim(p.curve.j)}` : undefined],
      ]
    : ["Available liquidity", "Supply APY", "Borrow APY", "Utilization", "Liquidation bonus", "Reserve factor", "Status", "Rate curve"].map((l): Fig => [l, D]);
  const oracle: Fig[] = [
    ["Price", price > 0 ? "$" + nf(price, price < 1 ? 4 : 2) : D],
    ["Source", risk ? risk.oracle : D],
    ["Max price age", risk && risk.maxAgeSecs > 0 ? `${risk.maxAgeSecs}s` : D],
  ];
  const limits: Fig[] = [
    ["Exchange rate", live && p.rate ? fXr(p.rate) : D, live && p.rate ? `${s} per ${shareSym(s)}` : undefined],
    ["Supply cap", ...cap(p.supCap, p.sup)],
    ["Borrow cap", ...cap(p.borCap, p.bor)],
  ];
  const addrs = addrsOf(p);
  return (
    <>
      <Text style={[styles.st, { color: colors.text }]}>Statistics</Text>
      <Card style={{ gap: 0 }}>
        <View style={[styles.rings, { borderBottomColor: colors.divider }]}>
          <Ring pc={supPct} color={colors.positive} label="Total supplied" main={live ? `${fL(p.sup)} ${s}` : D} sub={live ? u(p.sup) : ""} legend={`${live ? pct(supPct) : D} available`} live={live} />
          <View style={[styles.rdv, { backgroundColor: colors.divider }]} />
          <Ring pc={util} color={colors.link} label="Total borrowed" main={live ? `${fL(p.bor)} ${s}` : D} sub={live ? u(p.bor) : ""} legend={`${live ? pct(util) : D} borrowed`} live={live} />
        </View>
        <Figs rows={stats} />
      </Card>
      <Text style={[styles.st, { color: colors.text }]}>Oracle</Text>
      <Card style={styles.list}>
        <Figs rows={oracle} />
      </Card>
      <Text style={[styles.st, { color: colors.text }]}>Limits</Text>
      <Card style={styles.list}>
        <Figs rows={limits} />
      </Card>
      <Text style={[styles.st, { color: colors.text }]}>Contracts</Text>
      <Card style={styles.list}>
        {addrs.map(([l, a], i) => (
          <View key={l} style={[styles.addr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <Text style={[styles.al, { color: colors.muted }]} numberOfLines={1}>{l}</Text>
              <Text style={[styles.mono, { color: colors.text }]} numberOfLines={1}>{shortAddr(a)}</Text>
            </View>
            <Pressable onPress={() => Clipboard.setStringAsync(a).then(() => toast("Address copied"))} style={styles.ib} accessibilityRole="button" accessibilityLabel={`Copy ${l} address`}>
              <Icon name="content_copy" size={20} color="muted" />
            </Pressable>
            <Pressable onPress={() => openUrl(explorerAddr(a))} style={[styles.ib, { marginRight: -12 }]} accessibilityRole="link" accessibilityLabel={`Open ${l} in explorer`}>
              <Icon name="open_in_new" size={20} color="muted" />
            </Pressable>
          </View>
        ))}
      </Card>
    </>
  );
}

// Label and value on one line, the sub line under them on the right.
function Figs({ rows }: { rows: Fig[] }) {
  const { colors } = useTheme();
  return rows.map(([l, v, sub], i) => (
    <View key={l} style={[styles.fr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
      <View style={styles.frTop}>
        <Text style={[styles.frl, { color: colors.muted }]}>{l}</Text>
        <Text style={[styles.frv, { color: colors.text }]} numberOfLines={1}>{v}</Text>
      </View>
      {sub ? <Text style={[styles.cap, { color: colors.muted, textAlign: "right" }]}>{sub}</Text> : null}
    </View>
  ));
}

// A 72 px ring gauge with its percentage inside, then the label, amount, dollar value and a legend line.
function Ring({ pc, color, label, main, sub, legend, live }: { pc: number; color: string; label: string; main: string; sub: string; legend: string; live: boolean }) {
  const { colors } = useTheme();
  const r = 30, C = 2 * Math.PI * r, len = (Math.max(0, Math.min(100, pc)) / 100) * C;
  return (
    <View style={styles.ring}>
      <View style={styles.gauge}>
        <Svg width={72} height={72} style={styles.rot}>
          <Circle cx={36} cy={36} r={r} fill="none" stroke={colors.border} strokeWidth={6} />
          {live && len > 0.01 && <Circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${len.toFixed(2)} ${C.toFixed(2)}`} />}
        </Svg>
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Text style={[styles.gt, { color: colors.text }]}>{live ? pct(pc) : D}</Text>
        </View>
      </View>
      <View style={{ alignItems: "center", gap: 2, maxWidth: "100%" }}>
        <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.rv, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{main}</Text>
        {sub !== "" && <Text style={[styles.cap, { color: colors.muted }]}>{sub}</Text>}
        <View style={styles.rk}>
          <View style={[styles.key, { backgroundColor: color }]} />
          <Text style={[styles.cap, { color: colors.muted }]}>{legend}</Text>
        </View>
      </View>
    </View>
  );
}

// A history row; `failed` is set by a reader that knows the transaction's result (today's history only lists confirmed ones).
export type PoolTx = Activity & { failed?: boolean };

export function PoolActivity({ p, rows }: { p: Pool; rows: PoolTx[] }) {
  const { colors } = useTheme();
  const w = useWallets();
  const wallet = w.wallets.solana.find((x) => x.id === w.inUse.solana);
  if (!rows.length) return <EmptyCard title="No transactions yet" module="earn" />;
  const n = rows.length;
  return (
    <>
      <View style={styles.acth}>
        <Text style={[styles.st, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>Your transactions</Text>
        <Text style={[styles.cap, { color: colors.muted }]}>{n} transaction{n === 1 ? "" : "s"}</Text>
      </View>
      <Card style={styles.list}>
        {rows.map((r, i) => (
          <TxRow key={(r.hash ?? r.tx) + i} r={r} sym={p.sym} first={i === 0} />
        ))}
      </Card>
      {wallet && (
        <Pressable onPress={() => openUrl(explorerAddr(wallet.full))} style={styles.lnk} accessibilityRole="link">
          <Text style={[styles.lnkT, { color: colors.link }]}>View all on Solana Explorer</Text>
          <Icon name="open_in_new" size={16} color="link" />
        </Pressable>
      )}
    </>
  );
}

function TxRow({ r, sym, first }: { r: PoolTx; sym: string; first: boolean }) {
  const { colors } = useTheme();
  const ok = !r.failed;
  const legs = r.amt.split(", ").filter(Boolean);
  // "+1 SOL" → "1 SOL"; the dollar value at today's price, as the website
  const amt = (legs[legs.length - 1] ?? "").replace(/^[+−-]/, "");
  const n = parseFloat(amt.replace(/,/g, "")), price = px(r.sym ?? sym);
  const value = Number.isFinite(n) && price > 0 ? n * price : r.usd;
  const d = r.ms ? new Date(r.ms) : null;
  const when = d ? `${d.toLocaleDateString("en-US")} · ${d.toLocaleTimeString("en-US")}` : r.t;
  return (
    <View style={[{ paddingTop: 12 }, !first && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
      <View style={styles.txTop}>
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <View style={styles.badges}>
            <ActionTag label={r.action} tone={r.action === "Supply" ? "teal" : "grey"} />
            <StatusBadge ok={ok} />
          </View>
          <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={1}>{when}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2, maxWidth: "50%" }}>
          <View style={styles.amtRow}>
            <TokenLogo sym={r.sym ?? sym} size={18} />
            <Text style={[styles.amt, { color: ok ? colors.text : colors.muted }]} numberOfLines={1}>{amt || D}</Text>
          </View>
          {value != null && <Text style={[styles.cap, { color: colors.muted }]}>{usd(value)}</Text>}
        </View>
      </View>
      <Pressable onPress={() => openTx(r.hash)} style={styles.txh} accessibilityRole="link" accessibilityLabel={r.hash ? `Open transaction ${r.hash.slice(0, 8)} in explorer` : "No transaction hash"}>
        <Text style={[styles.cap, { color: colors.muted, flex: 1 }]}>Tx hash</Text>
        <Text style={[styles.mono, { color: colors.link, textDecorationLine: "underline" }]}>{r.hash ? `${r.hash.slice(0, 8)}…${r.hash.slice(-4)}` : D}</Text>
        <Icon name="open_in_new" size={16} color="link" />
      </Pressable>
    </View>
  );
}

function StatusBadge({ ok }: { ok: boolean }) {
  const { colors } = useTheme();
  const c = ok ? colors.positive : colors.negative;
  // 8-digit hex: the status colour at 10% (Success) / 14% (Failed)
  return (
    <View style={[styles.badge, { backgroundColor: c + (ok ? "1A" : "24") }]}>
      <View style={[styles.bdot, { backgroundColor: c }]} />
      <Text style={[styles.badgeT, { color: c }]}>{ok ? "Success" : "Failed"}</Text>
    </View>
  );
}

const MONO = Platform.select({ ios: "Menlo", default: "monospace" });
const styles = StyleSheet.create({
  st: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, marginTop: 4, marginBottom: -4 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  list: { paddingVertical: 4, gap: 0 },
  rings: { flexDirection: "row", alignItems: "stretch", paddingBottom: 16, borderBottomWidth: 1 },
  rdv: { width: 1 },
  ring: { flex: 1, minWidth: 0, alignItems: "center", gap: 10, paddingVertical: 6, paddingHorizontal: 4 },
  gauge: { width: 72, height: 72 },
  rot: { transform: [{ rotate: "-90deg" }] },
  center: { alignItems: "center", justifyContent: "center" },
  gt: { fontFamily: font.semibold, fontSize: 11.5, letterSpacing: -0.2, fontVariant: ["tabular-nums"] },
  rv: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, fontVariant: ["tabular-nums"] },
  rk: { flexDirection: "row", alignItems: "center", gap: 6 },
  key: { width: 8, height: 8, borderRadius: 2 },
  fr: { minHeight: 52, paddingVertical: 14, gap: 2, justifyContent: "center" },
  frTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  frl: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  frv: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums"] },
  addr: { flexDirection: "row", alignItems: "center", minHeight: 64, paddingVertical: 6 },
  al: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  mono: { fontFamily: MONO, fontSize: 13, lineHeight: 18 },
  ib: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  acth: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 8 },
  txTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: { minHeight: 22, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  bdot: { width: 6, height: 6, borderRadius: 3 },
  badgeT: { fontFamily: font.semibold, fontSize: 12, lineHeight: 18 },
  amtRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  amt: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums", "no-contextual"] },
  txh: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, marginTop: 4 },
  lnk: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 48, borderRadius: 24 },
  lnkT: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
});
