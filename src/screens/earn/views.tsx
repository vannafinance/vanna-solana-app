import { type Href, router } from "expo-router";
import { useRef, useState } from "react";
import { type HostInstance, Pressable, StyleSheet, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { Chart, curve } from "@/components/chart";
import { HistoryList } from "@/components/history";
import { SubTabs, Swap } from "@/components/motion";
import { Icon } from "@/components/ui/icon";
import { Card, EmptyCard, IconAction, Pairs, shareIcon, supplyMark, withdrawMark } from "@/components/ui/kit";
import { pct, sUsd, usd } from "@/format";
import { ACTIVITY, DATA, POOLS_BY } from "@/sample/data";
import { useDataVersion } from "@/state/store";
import { useChain } from "@/state/chain";
import { personalReady } from "@/state/personal";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { openMenu, toast } from "@/ui/overlay";

import { openAmount } from "./amount";
import { balTok, CATS, catOf, cNum, cUsd, earnTotals, freeTok, fullAmt, isStable, lendOf, px } from "./model";
import { openShare } from "@/screens/share/share";

/* Earn (design screens/earn.js): Vaults | Positions | History under the Earn | Predict pill. */
export type EarnTab = "vaults" | "positions" | "history";

export function Earn({ tab, setTab }: { tab: EarnTab; setTab: (t: EarnTab) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <SubTabs items={[["vaults", "Vaults"], ["positions", "Positions"], ["history", "History"]]} value={tab} onChange={setTab} fam={families.earn} />
      <Swap k={tab}>
        <View style={{ gap: 12 }}>{tab === "vaults" ? <Vaults /> : tab === "positions" ? <Positions onBrowse={() => setTab("vaults")} /> : <EarnHistory />}</View>
      </Swap>
    </View>
  );
}

function Vaults() {
  useDataVersion();
  const { chain } = useChain();
  const { colors } = useTheme();
  const [pool, setPool] = useState<string>("all");
  const ps = POOLS_BY[chain];
  const opts: [string, string, number][] = [["all", "All pools", ps.length], ...CATS.map((c) => [c, c, ps.filter((p) => catOf(p.sym) === c).length] as [string, string, number]).filter((o) => o[2] > 0)];
  const cur = opts.some((o) => o[0] === pool) ? pool : "all";
  const mine = (s: string) => balTok(lendOf(chain, s)) * px(s);
  const list = ps.filter((p) => cur === "all" || catOf(p.sym) === cur).slice().sort((a, b) => mine(b.sym) - mine(a.sym));

  const anchor = useRef<HostInstance>(null);
  const pick = () =>
    openMenu(
      anchor,
      (close) => (
        <>
          {opts.map(([k, l, n]) => (
            <Pressable key={k} onPress={() => (setPool(k), close())} style={[styles.mi, k === cur && { backgroundColor: colors.tealTint }]} accessibilityRole="menuitem" accessibilityLabel={`${l}, ${n}`}>
              <Text style={{ flex: 1, fontFamily: font.semibold, fontSize: 15, color: colors.text }}>{l}</Text>
              {k === cur && <Icon name="check" size={18} color="link" />}
              <View style={[styles.bd, { backgroundColor: colors.segment }]}>
                <Text style={{ fontFamily: font.semibold, fontSize: 12, color: colors.muted }}>{n}</Text>
              </View>
            </Pressable>
          ))}
        </>
      ),
      { width: 240, alignLeft: true },
    );

  return (
    <>
      <Pressable ref={anchor} onPress={pick} style={[styles.pm, { borderColor: colors.border }]} accessibilityRole="button" accessibilityLabel={`Pool filter, ${opts.find((o) => o[0] === cur)?.[1]}`}>
        <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>{opts.find((o) => o[0] === cur)?.[1]}</Text>
        <Icon name="keyboard_arrow_down" size={18} />
      </Pressable>
      {list.map((p) => {
        const l = lendOf(chain, p.sym), b = balTok(l), free = freeTok(p), stable = isStable(p.sym);
        return (
          <Pressable key={p.sym} onPress={() => router.push(`/lend/vault/${p.sym}` as Href)} accessibilityRole="button" accessibilityLabel={`${p.sym} vault, supply APY ${pct(p.supA)}`}>
            <Card>
              <View style={styles.vh}>
                <TokenLogo sym={p.sym} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.sym, { color: colors.text }]}>{p.sym}</Text>
                  {chain === "stellar" && <Text style={[styles.cap, { color: colors.muted }]}>Blend</Text>}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.apy, { color: colors.positive }]}>{pct(p.supA)}</Text>
                  <Text style={[styles.cap, { color: colors.muted }]}>APY</Text>
                </View>
              </View>
              <Pairs
                items={[
                  { label: "Total supply", value: cNum(p.sup), sub: stable ? undefined : cUsd(p.sup * px(p.sym)) },
                  { label: "Available", value: cNum(free), sub: stable ? undefined : cUsd(free * px(p.sym)) },
                  { label: "Utilization", value: pct(p.util, 1) },
                ]}
              />
              {l && personalReady(chain) && (
                <View style={styles.you}>
                  <Text style={[styles.youL, { color: colors.muted }]}>Your supply</Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.youV, { color: colors.text }]}>{fullAmt(b, p.sym)}</Text>
                    {!stable && <Text style={[styles.cap, { color: colors.muted }]}>{usd(b * px(p.sym))}</Text>}
                  </View>
                </View>
              )}
            </Card>
          </Pressable>
        );
      })}
    </>
  );
}

const RANGES = ["1W", "1M", "3M", "All"] as const;

function Positions({ onBrowse }: { onBrowse: () => void }) {
  const { chain } = useChain();
  const { colors } = useTheme();
  const [mode, setMode] = useState<"deposit" | "earnings">("deposit");
  const [range, setRange] = useState<(typeof RANGES)[number]>("3M");
  const T = earnTotals(chain);
  const lend = personalReady(chain) ? DATA[chain].lend.slice().sort((a, b) => balTok(b) * px(b.sym) - balTok(a) * px(a.sym)) : [];
  if (!lend.length) return <EmptyCard title="No supplied assets" action="Browse vaults" onAction={onBrowse} module="earn" />;

  const n = range === "1W" ? 29 : range === "1M" ? 31 : range === "3M" ? 92 : 60;
  const end = mode === "earnings" ? T.earned : T.val;
  const pts = curve(end, mode === "earnings" ? 2 : 5, n, mode === "deposit" ? Math.round(n * 0.15) : 0).map((v, i, a) => (mode === "deposit" && i > 0 ? Math.max(v, a[i - 1] * 0.98) : v));
  const chg = pts[pts.length - 1] - pts[0];
  const x = range === "1W" ? ["Sep 30", "Oct 3", "Oct 7"] : range === "1M" ? ["Sep 7", "Sep 22", "Oct 7"] : range === "3M" ? ["Jul 8", "Aug 22", "Oct 7"] : ["Aug 20", "Sep 13", "Oct 7"];

  return (
    <>
      <Card style={{ paddingTop: 0 }}>
        <SubTabs items={[["deposit", "Deposits"], ["earnings", "Earnings"]]} value={mode} onChange={setMode} fam={families.earn} />
        <Text style={[styles.big, { color: chg > 0.005 ? colors.positive : colors.text }]}>{sUsd(chg)}</Text>
        <Text style={[styles.cap, { color: colors.muted, marginTop: -6 }]}>Since {x[0]}</Text>
        <Swap k={mode + range}>
          <Chart pts={pts} color={colors.positive} height={156} x={x} label={`${mode === "earnings" ? "Net earnings" : "Overall deposit"} over ${range}`} />
        </Swap>
        <View style={[styles.rch, { backgroundColor: colors.segment }]} accessibilityRole="tablist">
          {RANGES.map((r) => (
            <Pressable key={r} onPress={() => setRange(r)} accessibilityRole="tab" accessibilityState={{ selected: r === range }} style={[styles.rc, r === range && { backgroundColor: colors.segmentActive }]}>
              <Text style={{ fontFamily: font.semibold, fontSize: 13, color: r === range ? colors.text : colors.muted }}>{r}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      {lend.map((l) => {
        const p = POOLS_BY[chain].find((x) => x.sym === l.sym), b = balTok(l), e = l.earned * px(l.sym);
        return (
          <Card key={l.sym}>
            <View style={styles.vh}>
              <TokenLogo sym={l.sym} size={40} />
              <Text style={[styles.sym, { color: colors.text, flex: 1 }]}>{l.sym}</Text>
              <Text style={[styles.sym, { color: colors.text }]}>{usd(b * px(l.sym))}</Text>
            </View>
            <Pairs
              items={[
                { label: "Supplied", value: `${b >= 1000 ? Math.round(b).toLocaleString("en-US") : b.toFixed(2)} ${l.sym}` },
                { label: "APY", value: pct(p?.supA ?? 0) },
                { label: "Earned", value: e > 0.005 ? sUsd(e) : usd(e), tone: e > 0.005 ? "pos" : "" },
              ]}
            />
            <View style={styles.acts}>
              <IconAction icon={supplyMark} label={`Supply more ${l.sym}`} onPress={() => openAmount(chain, l.sym, "supply")} />
              <IconAction icon={withdrawMark} label={`Withdraw ${l.sym}`} onPress={() => openAmount(chain, l.sym, "withdraw")} />
              <IconAction icon={shareIcon} label={`Share ${l.sym} position`} onPress={() => openShare({ kind: "earn", id: l.sym })} />
            </View>
          </Card>
        );
      })}
    </>
  );
}

function EarnHistory() {
  const { chain } = useChain();
  return <HistoryList rows={ACTIVITY[chain].filter((r) => r.area === "Earn")} empty="No activity yet" module="earn" />;
}

const styles = StyleSheet.create({
  pm: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1 },
  mi: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 12, marginHorizontal: 6, borderRadius: 12 },
  bd: { minWidth: 24, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  vh: { flexDirection: "row", alignItems: "center", gap: 12 },
  sym: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, fontVariant: ["tabular-nums"] },
  apy: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  you: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 4 },
  youL: { fontFamily: font.regular, fontSize: 14 },
  youV: { fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  big: { fontFamily: font.semibold, fontSize: 24, lineHeight: 32, marginTop: 12, fontVariant: ["tabular-nums"] },
  rch: { flexDirection: "row", padding: 4, borderRadius: 12, gap: 4 },
  rc: { flex: 1, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  acts: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
});
