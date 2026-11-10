import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams } from "expo-router";

import { CONTRACTS, EARN_POOLS } from "@/chain/stellar/config";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { TokenLogo } from "@/components/brand";
import { niceTicks } from "@/components/chart";
import { HistoryList } from "@/components/history";
import { PillTabs, Swap } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, Pairs, shareIcon } from "@/components/ui/kit";
import { nf, pct, usd } from "@/format";
import { ACTIVITY, PX } from "@/sample/data";
import { useChain } from "@/state/chain";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { toast } from "@/ui/overlay";

import { openAmount } from "@/screens/earn/amount";
import { ADDR, balTok, cNum, COLL, cUsd, freeTok, isStable, lendOf, poolOf, px, rateCurve, shareRate, shareSym } from "@/screens/earn/model";
import { AfterTransition } from "@/ui/ready";
import { openShare } from "@/screens/share/share";

/* Vault detail (design SCREENS['earn-vault']): the vault card, Position | Details | Activity | Collateral | Rates, Withdraw / Supply. */
type T = "position" | "details" | "activity" | "collateral" | "rates";

export default function Vault() {
  useDataVersion();
  const { sym, id } = useLocalSearchParams<{ sym?: string; id?: string }>();
  const { chain } = useChain();
  const { colors } = useTheme();
  const targetSym = sym ?? id ?? "";
  const p = poolOf(chain, targetSym);
  const l = p ? lendOf(chain, p.sym) : null;
  const pos = l ? balTok(l) : 0;
  const tabs: [T, string][] = [
    ["position", "Position"],
    ["details", "Details"],
    ["activity", "Activity"],
    ["collateral", "Collateral"],
    ["rates", "Rates"],
  ];
  const [tab, setTab] = useState<T>("position");
  const cur = tabs.some(([k]) => k === tab) ? tab : "position";

  if (!p)
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScreenHeader title="" />
        <View style={{ padding: 16 }}>
          <EmptyCard title="Vault not found" module="earn" />
        </View>
      </View>
    );

  const free = freeTok(p), stable = isStable(p.sym);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title="" />
      <AfterTransition>
      <ScrollView contentContainerStyle={styles.body}>
        <Card>
          <View style={styles.vh}>
            <TokenLogo sym={p.sym} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sym, { color: colors.text }]}>{p.sym}</Text>
              {chain === "stellar" && <Text style={[styles.cap, { color: colors.muted }]}>Blend</Text>}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={[styles.apy, { color: colors.positive }]}>{pct(p.supA)}</Text>
              <Text style={[styles.cap, { color: colors.muted }]}>Supply APY</Text>
            </View>
          </View>
          <Pairs
            items={[
              { label: "Total supply", value: cNum(p.sup), sub: stable ? undefined : cUsd(p.sup * px(p.sym)) },
              { label: "Available", value: cNum(free), sub: stable ? undefined : cUsd(free * px(p.sym)) },
              { label: "Utilization", value: pct(p.util, 1) },
            ]}
          />
        </Card>
        <PillTabs items={tabs} value={cur} onChange={setTab} color={families.earn.tab} />
        <Swap k={cur}>
          <View style={{ gap: 12 }}>
            {cur === "position" && (
              <Card>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[styles.big, { color: colors.text, flex: 1 }]}>{usd(pos * px(p.sym))}</Text>
                  {pos > 0 && <IconAction icon={shareIcon} label={`Share ${p.sym} position`} onPress={() => openShare({ kind: "earn", id: p.sym })} />}
                </View>
                <Pairs
                  items={[
                    { label: "Supplied", value: nf(pos, pos >= 1000 ? 0 : 2), sub: p.sym },
                    { label: "Shares", value: nf(pos / shareRate(chain, p.sym), 2), sub: shareSym(p.sym) },
                    { label: "Earned", value: (pos > 0 ? "+" : "") + nf(l?.earned ?? 0, stable ? 2 : 4), sub: p.sym, tone: pos > 0 ? "pos" : undefined },
                  ]}
                />
                {pos === 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Button label="Supply" fam={families.earn} onPress={() => openAmount(chain, p.sym, "supply")} />
                  </View>
                )}
              </Card>
            )}
            {cur === "details" && <Details />}
            {cur === "activity" && <HistoryList rows={ACTIVITY[chain].filter((r) => r.area === "Earn" && r.sym === p.sym)} empty="No activity yet" module="earn" />}
            {cur === "collateral" && <Collateral />}
            {cur === "rates" && <Rates />}
          </View>
        </Swap>
      </ScrollView>
      </AfterTransition>
      <View style={[styles.foot, { backgroundColor: colors.bg, borderTopColor: colors.divider }]}>
        {pos > 0 && <Button label="Withdraw" v="outline" style={{ flex: 1 }} onPress={() => openAmount(chain, p.sym, "withdraw")} />}
        <Button label="Supply" fam={families.earn} style={{ flex: 1 }} onPress={() => openAmount(chain, p.sym, "supply")} />
      </View>
    </View>
  );

  function Details() {
    const s = p!.sym, cap = niceCap(p!.sup), xlm = chain === "stellar";
    // Stellar (as the site shows): no reserve cut (supply APY = borrow APY x utilisation), a dynamic 0-15% liquidation
    // penalty, and the live vToken supply and exchange rate instead of caps.
    const addrs = contractsOf(chain, s);
    return (
      <>
        <Card>
          <Pairs
            n={2}
            items={[
              { label: "Borrow APY", value: pct(p!.borA) },
              xlm ? { label: "Liquidation penalty", value: "0–15%" } : { label: "Reserve factor", value: pct(10) },
              xlm ? { label: "Total borrowed", value: cNum(p!.bor) } : { label: "Liquidation bonus", value: pct(stable ? 2.5 : 5) },
              { label: "Liquidated at", value: "Health 1.10" },
            ]}
          />
        </Card>
        <Section title="Oracle" rows={[["Price", "$" + nf(PX[s] ?? 0, (PX[s] ?? 0) < 10 ? 4 : 2)], ["Source", xlm ? "Reflector" : "Pyth"], ["Max price age", xlm ? "300s" : "60s"]]} />
        <Section
          title={xlm ? "Shares" : "Limits"}
          rows={
            xlm
              ? [[`1 ${shareSym(s)} is worth`, `${nf(shareRate(chain, s), 6)} ${s}`], [`${shareSym(s)} in circulation`, p!.vSupply !== undefined ? `${cNum(p!.vSupply)} ${shareSym(s)}` : "—"]]
              : [[`1 ${shareSym(s)} is worth`, `${nf(shareRate(chain, s), 4)} ${s}`], ["Supply cap", `${cNum(cap)} ${s}`], ["Borrow cap", `${cNum(cap * 0.8)} ${s}`]]
          }
        />
        <Text style={[styles.st, { color: colors.text }]}>Contracts</Text>
        <Card style={{ paddingVertical: 4, gap: 0 }}>
          {addrs.map(([lb, a, full], i) => (
            <View key={lb} style={[styles.fr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <Text style={[styles.frl, { color: colors.muted }]}>{lb}</Text>
              <Text style={[styles.mono, { color: colors.text }]}>{a}</Text>
              <Pressable onPress={() => (full ? Clipboard.setStringAsync(full).then(() => toast("Address copied")) : toast("Address copied"))} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Copy ${lb} address`}>
                <Icon name="content_copy" size={16} color="muted" />
              </Pressable>
            </View>
          ))}
        </Card>
      </>
    );
  }

  function Collateral() {
    const cap = niceCap(p!.sup);
    return (
      <>
        <Card>
          <CapUsage label="Supply cap usage" usedL="Supplied" used={p!.sup} cap={cap} s={p!.sym} />
          <CapUsage label="Borrow cap usage" usedL="Borrowed" used={p!.bor} cap={cap * 0.8} s={p!.sym} />
        </Card>
        <Text style={[styles.st, { color: colors.text }]}>Assets on a margin account</Text>
        <Card style={{ gap: 0, paddingVertical: 8 }}>
          <View style={styles.ch}>
            {["Asset", "Collateral", "Borrow", "Liq. bonus"].map((h, i) => (
              <Text key={h} style={[styles.cap, { color: colors.muted, flex: i === 0 ? 1 : 0, width: i === 0 ? undefined : 72, textAlign: i === 0 ? "left" : "center" }]}>
                {h}
              </Text>
            ))}
          </View>
          {COLL[chain].map(([s, c, b, lb]) => (
            <View key={s} style={styles.cr}>
              <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TokenLogo sym={s} size={28} />
                <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{s}</Text>
              </View>
              {[c, b].map((v, i) => (
                <View key={i} style={{ width: 72, alignItems: "center" }}>
                  {v ? <Icon name="check_circle" size={18} color={colors.positive} filled /> : <Text style={{ color: colors.muted }}>—</Text>}
                </View>
              ))}
              <Text style={{ width: 72, textAlign: "center", fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{pct(lb)}</Text>
            </View>
          ))}
        </Card>
      </>
    );
  }

  function Rates() {
    const c = rateCurve(p!);
    const [w, setW] = useState(0);
    const H = 172, ticks = niceTicks(0, c.samples[c.samples.length - 1].b), top = ticks[ticks.length - 1];
    const X = (u: number) => u * w, Y = (v: number) => H - (v / top) * H;
    const path = (k: "b" | "l") => c.samples.map((s, i) => `${i ? "L" : "M"}${X(s.u).toFixed(1)} ${Y(s[k]).toFixed(1)}`).join("");
    return (
      <Card>
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>Today, {Math.round(c.cur.u * 100)}% borrowed</Text>
        <Pairs items={[{ label: "Borrow APY", value: pct(c.cur.b * 100) }, { label: "Supply APY", value: pct(c.cur.l * 100), tone: "pos" }]} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1, height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
            {w > 0 && (
              <Svg width={w} height={H} style={{ overflow: "visible" }}>
                {ticks.map((t) => (
                  <Line key={t} x1={0} x2={w} y1={Y(t)} y2={Y(t)} stroke={colors.divider} />
                ))}
                <Line x1={X(c.kink.u)} x2={X(c.kink.u)} y1={0} y2={H} stroke={colors.borderControl} strokeDasharray="2 3" />
                <SvgText x={X(c.kink.u) - 4} y={14} fontSize={11} fill={colors.muted} textAnchor="end">
                  Kink 80%
                </SvgText>
                <Line x1={X(c.cur.u)} x2={X(c.cur.u)} y1={0} y2={H} stroke="#FC5457" />
                <Path d={path("l")} stroke={colors.positive} strokeWidth={2} strokeDasharray="5 4" fill="none" />
                <Path d={path("b")} stroke={colors.link} strokeWidth={2.5} fill="none" />
                <Circle cx={X(c.cur.u)} cy={Y(c.cur.b)} r={4.5} fill="#FC5457" />
              </Svg>
            )}
          </View>
          <View style={{ height: H + 16, marginVertical: -8, justifyContent: "space-between" }}>
            {ticks
              .slice()
              .reverse()
              .map((t) => (
                <Text key={t} style={{ fontFamily: font.regular, fontSize: 11, color: colors.muted, textAlign: "right" }}>
                  {Math.round(t * 100)}%
                </Text>
              ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginRight: 40 }}>
          {["0%", "50%", "100% used"].map((x) => (
            <Text key={x} style={[styles.cap, { color: colors.muted }]}>{x}</Text>
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Legend color={colors.link} label="Borrow rate" />
          <Legend color={colors.positive} label="Lender rate" dashed />
        </View>
      </Card>
    );
  }
}

// Contract rows: Stellar's real IDs (the site's Addresses list); Solana keeps the designed rows until its vault IDs are wired.
const cut = (a: string) => `${a.slice(0, 6)}…${a.slice(-6)}`;
function contractsOf(chain: "solana" | "stellar", s: string): [string, string, string?][] {
  const c = chain === "stellar" ? EARN_POOLS[s] : undefined;
  if (!c) return ADDR[chain];
  const rows: [string, string][] = [
    [`${shareSym(s)} token`, c.vToken],
    ["Lending pool", c.pool],
    ["Risk engine", CONTRACTS.RISK_ENGINE],
    ["Oracle", CONTRACTS.ORACLE],
    ["Interest rate model", CONTRACTS.RATE_MODEL],
    ["Registry", CONTRACTS.REGISTRY],
  ];
  return rows.map(([l, a]) => [l, cut(a), a]);
}

const niceCap = (x: number) => {
  const m = Math.pow(10, Math.floor(Math.log10(x * 1.25)));
  return [1, 2, 2.5, 5, 10].map((k) => k * m).find((v) => v >= x * 1.25) ?? 10 * m;
};

function Section({ title, rows }: { title: string; rows: [string, string][] }) {
  const { colors } = useTheme();
  return (
    <>
      <Text style={[styles.st, { color: colors.text }]}>{title}</Text>
      <Card style={{ paddingVertical: 4, gap: 0 }}>
        {rows.map(([l, v], i) => (
          <View key={l} style={[styles.fr, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
            <Text style={[styles.frl, { color: colors.muted }]}>{l}</Text>
            <Text style={[styles.frv, { color: colors.text }]}>{v}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function CapUsage({ label, usedL, used, cap, s }: { label: string; usedL: string; used: number; cap: number; s: string }) {
  const { colors } = useTheme();
  const u = cap ? (used / cap) * 100 : 0;
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[styles.frl, { color: colors.muted }]}>{label}</Text>
        <Text style={[styles.frv, { color: colors.text }]}>{pct(u, 1)}</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.segment, overflow: "hidden" }}>
        <View style={{ width: `${Math.min(100, u)}%`, height: 6, backgroundColor: colors.positive }} />
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={[styles.cap, { color: colors.muted }]}>{usedL} {cNum(used)} {s}</Text>
        <Text style={[styles.cap, { color: colors.muted }]}>Cap {cNum(cap)} {s}</Text>
      </View>
    </View>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Svg width={16} height={4}>
        <Line x1={0} x2={16} y1={2} y2={2} stroke={color} strokeWidth={2.5} strokeDasharray={dashed ? "4 3" : undefined} />
      </Svg>
      <Text style={[styles.cap, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 24 },
  vh: { flexDirection: "row", alignItems: "center", gap: 12 },
  sym: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  apy: { fontFamily: font.semibold, fontSize: 32, lineHeight: 40, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  big: { fontFamily: font.semibold, fontSize: 24, lineHeight: 32, fontVariant: ["tabular-nums"] },
  st: { fontFamily: font.semibold, fontSize: 15, marginTop: 8 },
  fr: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48 },
  frl: { flex: 1, fontFamily: font.regular, fontSize: 14 },
  frv: { fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  mono: { fontFamily: font.regular, fontSize: 12 },
  ch: { flexDirection: "row", alignItems: "center", minHeight: 32 },
  cr: { flexDirection: "row", alignItems: "center", minHeight: 48 },
  foot: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
});
