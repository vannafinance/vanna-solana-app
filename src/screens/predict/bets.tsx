import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, IconAction, Pairs } from "@/components/ui/kit";
import { sUsd, usd } from "@/format";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { openSheet, toast } from "@/ui/overlay";

import {
  addWallet, bringSpec, cpair, type Ev, holdx, lab, type Out, p2, P, pmx, posTitle, removeWallet, shf, type Side, startSpec, walletOf, withdrawSpec, worldIdle,
} from "./model";
import { openMarket } from "./nav";
import { runClaim, runSpec, openTrade } from "./trade";
import { Chip, OutIcon, SideTag, type Tone, TipBox, TipBtn, Tips, useTip } from "./ui";

/* Bet rows (design betRows / betList): one card per position, from every source (Vanna pool, World shares in a linked wallet, Polymarket). */
export type BetRow = {
  id: string; go: { ev: string; m: string; side: Side } | null; e: Ev | undefined; o: Out | undefined; s: Side; L: string; title: string; out: string; sh: number; avg: number; now: number;
  res: boolean; won: boolean; value: number; pnl: number; src: string; wallet: string; st: { tone: Tone; txt: string; tip?: "tracked" | "notListed" }; kind: "pool" | "hold"; claim: number;
  world: boolean; listed: boolean;
};

export function betRows(filter?: (r: BetRow) => boolean): BetRow[] {
  const rows: BetRow[] = [];
  P.pos.forEach((p) => {
    const m = pmx(p), w = walletOf(p.wallet);
    const st = m.res ? (m.won ? { tone: "teal" as Tone, txt: "Won" } : { tone: "grey" as Tone, txt: "Lost" }) : m.merging ? { tone: "pink" as Tone, txt: "Joining the pool" } : { tone: "teal" as Tone, txt: `Earning ${p2(m.apy)}` };
    const r: BetRow = { id: p.id, go: { ev: p.ev, m: p.o, side: p.side }, e: m.e, o: m.o, s: p.side, L: lab(m.o, p.side), title: posTitle(m.e, m.o), out: m.e.outs.length > 1 ? m.o.name : "", sh: m.tot,
      avg: p.avg * 100, now: m.mk * 100, res: m.res, won: m.won, value: m.value, pnl: m.pnl, src: p.src === "polymarket" ? "vanna" : p.src, wallet: w ? w.name : "", st, kind: "pool", claim: m.claim, world: p.src === "world", listed: true };
    if (!filter || filter(r)) rows.push(r);
  });
  P.hold.forEach((h) => {
    const x = holdx(h), w = walletOf(h.wallet);
    const st = h.src === "world" ? { tone: "pink" as Tone, txt: "Not earning" } : { tone: "grey" as Tone, txt: "Tracked", tip: (x.listed ? "tracked" : "notListed") as "tracked" | "notListed" };
    const r: BetRow = { id: h.id, go: x.listed && h.ev ? { ev: h.ev, m: h.o!, side: h.side } : null, e: x.e, o: x.o, s: h.side, L: x.L, title: x.listed && x.e && x.o ? posTitle(x.e, x.o) : x.title,
      out: x.listed && x.e && x.o ? (x.e.outs.length > 1 ? x.o.name : "") : x.out, sh: h.sh, avg: h.avg * 100, now: x.price, res: false, won: false, value: x.value, pnl: x.pnl, src: h.src, wallet: w ? w.name : "", st, kind: "hold", claim: 0, world: h.src === "world", listed: x.listed };
    if (!filter || filter(r)) rows.push(r);
  });
  return rows;
}

export function BetList({ rows }: { rows: BetRow[] }) {
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => (
        <BetCard key={r.id} r={r} />
      ))}
    </View>
  );
}

function BetCard({ r }: { r: BetRow }) {
  const { colors } = useTheme();
  const [tip, setTip] = useTip();
  const [pa, pn] = cpair(r.avg, r.now);
  const open = () => r.go && openMarket(r.go.ev, { m: r.go.m, side: r.go.side });
  const won = r.res && r.won && r.src === "vanna";
  const sellable = r.kind === "pool" && !r.res && r.e && r.o;
  const act =
    r.kind === "pool"
      ? r.res
        ? r.won ? <Button label="Claim" size="md" fam={families.predict} onPress={() => runClaim(r.id)} /> : null
        : <Button label="Sell" size="md" v="dark" onPress={() => r.e && r.o && openTrade(r.e, r.o, r.s, "sell")} />
      : r.world ? <Button label="Start earning" size="md" fam={families.predict} onPress={() => runSpec(startSpec([r.id]))} />
      : r.listed ? <Button label="Bring to Vanna" size="md" v="outline" onPress={() => runSpec(bringSpec(r.id))} />
      : <Text style={[s.cap, { color: colors.muted }]}>Not on Vanna</Text>;
  const icon =
    sellable && r.e && r.o
      ? r.world ? <IconAction icon="north" label="Withdraw to wallet" onPress={() => runSpec(withdrawSpec(r.id))} /> : <IconAction icon="add" label="Buy more" onPress={() => openTrade(r.e!, r.o!, r.s, "buy")} />
      : null;
  return (
    <Card>
      <Pressable onPress={open} disabled={!r.go} accessibilityRole={r.go ? "button" : undefined} accessibilityLabel={`Open ${r.title}`} style={s.row}>
        <OutIcon e={r.e ?? null} o={r.o} size={36} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={[s.b, { color: colors.text }]} numberOfLines={2}>{r.title}</Text>
          <View style={[s.row, { gap: 6 }]}>
            <SideTag side={r.s} label={r.L} />
            {!!r.out && <Text style={[s.cap, { color: colors.muted, flexShrink: 1 }]} numberOfLines={1}>{r.out}</Text>}
          </View>
        </View>
      </Pressable>
      <View style={[s.row, { alignItems: "baseline" }]}>
        <Text style={[s.lg, { color: colors.text }]}>{usd(r.value)}</Text>
        <Text style={[s.cap, { color: r.pnl < -0.004 ? colors.negative : r.pnl > 0.004 ? colors.positive : colors.muted, fontVariant: ["tabular-nums"] }]}>{sUsd(r.pnl)}</Text>
      </View>
      <Pairs items={[{ label: "Shares", value: shf(r.sh) }, { label: r.res ? "Avg / result" : "Avg / now", value: `${pa} → ${pn}` }, ...(r.res ? [] : [{ label: "Pays if right", value: usd(r.sh) }])]} />
      <TipBox k="t" open={tip}><Tips k={r.st.tip ?? "tracked"} /></TipBox>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        {!won ? (
          <View style={[s.row, { flexShrink: 1, flexWrap: "wrap" }]}>
            <Chip label={r.st.txt} tone={r.st.tone} />
            {r.st.tip && <TipBtn k="t" open={tip} setOpen={setTip} label="What tracked means" />}
            {r.src !== "vanna" && <SrcBadge src={r.src} />}
          </View>
        ) : <View />}
        <View style={s.row}>
          {act}
          {icon}
        </View>
      </View>
    </Card>
  );
}

export function SrcBadge({ src }: { src: string }) {
  const { colors } = useTheme();
  return (
    <View style={[s.row, { gap: 4, paddingHorizontal: 8, minHeight: 24, borderRadius: 12, backgroundColor: colors.bg }]}>
      <TokenLogo sym={src === "polymarket" ? "POLY" : "WORLD"} size={14} />
      <Text style={[s.cap, { color: colors.text, fontFamily: font.semibold }]}>{src === "polymarket" ? "Polymarket" : "World"}</Text>
    </View>
  );
}

/* Linked wallets (SHEETS['pd-linked']): connect only, no pasted addresses. */
export function openLinked(view: "main" | "add" = "main") {
  openSheet({ title: view === "add" ? "Add a wallet" : "Linked wallets", startLarge: true, content: (close) => <LinkedBody start={view} close={close} />, footer: () => <LinkedFooter /> });
}
function LinkedFooter() {
  useDataVersion();
  const idle = worldIdle();
  if (!idle.length) return null;
  return <Button label="Start earning on all" fam={families.predict} onPress={() => runSpec(startSpec(idle.map((h) => h.id)))} />;
}
function LinkedBody({ start }: { start: "main" | "add"; close: () => void }) {
  useDataVersion();
  const { colors } = useTheme();
  const [view, setView] = useState(start);
  const [kind, setKind] = useState<"solana" | "polymarket" | null>(null);
  const rows = betRows((r) => r.kind === "hold" || r.world);
  if (view === "add")
    return (
      <View style={{ gap: 12 }}>
        <Pressable onPress={() => setView("main")} style={[s.row, { minHeight: 44 }]} accessibilityRole="button">
          <Icon name="arrow_back" size={18} color={colors.link} />
          <Text style={[s.b, { color: colors.link }]}>Linked wallets</Text>
        </Pressable>
        {([["solana", "SOLANA_CHAIN", "Solana wallet", "World positions"], ["polymarket", "POLY", "Polymarket", "On Polygon"]] as const).map(([k, logo, t, d]) => (
          <Pressable key={k} onPress={() => setKind(k)} accessibilityRole="button" accessibilityState={{ selected: kind === k }} style={[s.kind, { borderColor: kind === k ? colors.link : colors.border, backgroundColor: kind === k ? colors.blueTint : colors.surface }]}>
            <TokenLogo sym={logo} size={32} />
            <View style={{ flex: 1 }}>
              <Text style={[s.b, { color: colors.text }]}>{t}</Text>
              <Text style={[s.cap, { color: colors.muted }]}>{d}</Text>
            </View>
            {kind === k && <Icon name="check_circle" size={20} filled color={colors.link} />}
          </Pressable>
        ))}
        {kind && <Text style={[s.cap, { color: colors.muted }]}>{kind === "solana" ? "Nothing moves until Start earning." : "Read only. Positions stay on Polygon."}</Text>}
        <Button
          label={kind === "polymarket" ? "Connect an EVM wallet" : kind === "solana" ? "Connect a Solana wallet" : "Pick a wallet type"}
          fam={families.predict}
          disabled={!kind}
          onPress={() => {
            if (!kind) return;
            const r = addWallet(kind);
            toast(`${r.name} linked. Found ${r.n} position${r.n === 1 ? "" : "s"}.`);
            setView("main");
            setKind(null);
          }}
        />
      </View>
    );
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 0, paddingVertical: 4 }}>
        {P.wallets.map((w, i) => {
          const n = P.hold.filter((h) => h.wallet === w.id).length + P.pos.filter((p) => p.wallet === w.id && p.src !== "vanna").length;
          const val = P.hold.filter((h) => h.wallet === w.id).reduce((t, h) => t + holdx(h).value, 0) + P.pos.filter((p) => p.wallet === w.id && p.src === "world").reduce((t, p) => t + pmx(p).value, 0);
          return (
            <View key={w.id} style={[s.row, { minHeight: 64 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <TokenLogo sym={w.kind === "polymarket" ? "POLY" : "SOLANA_CHAIN"} size={32} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.b, { color: colors.text }]} numberOfLines={1}>{w.name}</Text>
                <Text style={[s.cap, { color: colors.muted }]}>{w.addr}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.b, { color: colors.text }]}>{n} position{n === 1 ? "" : "s"}</Text>
                <Text style={[s.cap, { color: colors.muted }]}>{usd(val)}</Text>
              </View>
              {w.main ? <Chip label="Connected" tone="grey" /> : (
                <Pressable onPress={() => { const r = removeWallet(w.id); if (r) toast(`${r.name} removed${r.gone ? `, ${r.gone} tracked position${r.gone > 1 ? "s" : ""} hidden` : ""}`); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Remove ${w.name}`}>
                  <Icon name="close" size={20} color="muted" />
                </Pressable>
              )}
            </View>
          );
        })}
      </Card>
      <Button label="Add wallet" v="outline" size="md" icon="add" onPress={() => setView("add")} />
      {rows.length > 0 ? (
        <>
          <Text style={[s.b, { color: colors.text, fontSize: 16 }]}>Positions  <Text style={{ color: colors.muted, fontFamily: font.regular }}>{rows.length}</Text></Text>
          <BetList rows={rows} />
        </>
      ) : <Text style={[s.body, { color: colors.muted }]}>No positions found yet</Text>}
      <View style={[s.row, { padding: 12, borderRadius: 12, backgroundColor: colors.bg }]}>
        <TokenLogo sym="POLY" size={16} />
        <Text style={[s.cap, { color: colors.muted, flex: 1 }]}>Polymarket stays on Polygon. Bring to Vanna to earn.</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  b: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  lg: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  kind: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5 },
});
