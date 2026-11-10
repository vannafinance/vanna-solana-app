import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { type HostInstance, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TokenLogo } from "@/components/brand";
import { CandleChart } from "@/components/candle-chart";
import { SubTabs } from "@/components/motion";
import { ScreenHeader } from "@/components/screen-header";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Card, IconAction, Tag } from "@/components/ui/kit";
import { hfFmt, levFmt, nf, spct } from "@/format";
import { type PhoenixBook, type PhoenixTrade, usePhoenixBookTrades, usePhoenixCandles } from "@/chain/market-live";
import { perpMark } from "@/chain/perp-mark";
import { MascotFace } from "@/mascot/mascot";
import { DATA, type Side } from "@/sample/data";
import { acct, hasMargin, priceRoom } from "@/sample/model";
import { openBorrow, openFlash } from "@/screens/margin/sheets";
import { fam, openTicket, PERP_MKTS, PositionCard, priceFmt, Ticket } from "@/screens/trade/perps";
import { useChain } from "@/state/chain";
import { personalReady, usePersonal } from "@/state/personal";
import { useDataVersion } from "@/state/store";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { AfterTransition } from "@/ui/ready";
import { openMenu } from "@/ui/overlay";

/* Perps market page (design V7 perps-market): compact margin account strip (.card.px-as), market switcher dropdown via openMenu
   (in-place market switching without page reload), 4-column horizontal stats card with live funding countdown, interactive candles
   defaulting to 1D with full-screen mode & in-place Long / Short order sheet, open position card, and 10-level live order book | trades. */
const TF = ["1m", "5m", "15m", "1H", "4H", "1D"] as const;

const cdTxt = () => {
  const d = new Date();
  const v = 3599 - (d.getMinutes() * 60 + d.getSeconds());
  return String(Math.floor(v / 60)).padStart(2, "0") + ":" + String(v % 60).padStart(2, "0");
};

export default function PerpMarket() {
  useDataVersion();
  const { k } = useLocalSearchParams<{ k: string }>();
  const { colors } = useTheme();
  const { chain } = useChain();
  const ready = usePersonal(chain);

  const [pickedKey, setPickedKey] = useState<{ routeKey: string | undefined; k: string } | null>(null);
  const activeKey = pickedKey && pickedKey.routeKey === k ? pickedKey.k : typeof k === "string" && k ? k : "SOL";
  const setActiveKey = (nextK: string) => setPickedKey({ routeKey: k, k: nextK });

  const m = PERP_MKTS.find((x) => x.k === activeKey) ?? PERP_MKTS[0];
  const [tf, setTf] = useState<(typeof TF)[number]>("1D");
  const [book, setBook] = useState<"book" | "trades">("book");
  const [fullScreen, setFullScreen] = useState(false);
  const [fsTicketSide, setFsTicketSide] = useState<Side | null>(null);
  const [cd, setCd] = useState(cdTxt);
  const mktBtnRef = useRef<HostInstance>(null);

  useEffect(() => {
    const id = setInterval(() => setCd(cdTxt()), 1000);
    return () => clearInterval(id);
  }, []);

  const has = ready && hasMargin(DATA[chain]);
  const a = acct(chain);
  const nd = !(a.debtUsd > 0.005);
  const r = priceRoom(chain);
  const room = !ready ? "—" : r.state === "ok" ? `${(r.pct ?? 0) < 0 ? "−" : "+"}${nf(Math.abs(r.pct ?? 0), 1)}%` : r.state === "now" ? "Now" : "—";
  const roomColor = !ready ? colors.text : r.state === "now" ? colors.negative : r.pct != null && Math.abs(r.pct) < 10 ? colors.warning : colors.text;
  const hfColor = !has || nd ? colors.text : a.hf <= 1.1 ? colors.negative : a.hf < 1.5 ? colors.warning : colors.positive;

  const pos = DATA[chain].perps.filter((p) => p.k === m.k);
  const live = usePhoenixBookTrades(m.k, true);
  const liveMkt = live.markets[m.k];
  const price = liveMkt?.markPx ?? perpMark(m.k);
  const oraclePx = liveMkt?.oraclePx ?? m.oracle ?? price;
  const ch24 = liveMkt?.prevDayPx && liveMkt.prevDayPx > 0 ? ((price - liveMkt.prevDayPx) / liveMkt.prevDayPx) * 100 : m.ch;
  const fund1h = liveMkt?.fundingHourlyPct ?? m.fund;
  const oiUsd = liveMkt?.openInterest != null ? liveMkt.openInterest * price : m.oi;
  const volUsd = liveMkt?.dayVolumeUsd ?? m.vol;

  const openMarketMenu = () => {
    const openPos = personalReady(chain) ? DATA[chain].perps : [];
    openMenu(
      mktBtnRef,
      (close) => (
        <>
          {PERP_MKTS.map((row) => {
            const on = row.k === m.k;
            const liveRow = live.markets[row.k];
            const mkPx = liveRow?.markPx ?? perpMark(row.k);
            const ch = liveRow?.prevDayPx && liveRow.prevDayPx > 0 ? ((mkPx - liveRow.prevDayPx) / liveRow.prevDayPx) * 100 : row.ch;
            const rowPos = openPos.filter((p) => p.k === row.k);
            return (
              <Pressable
                key={row.k}
                onPress={() => {
                  setActiveKey(row.k);
                  close();
                }}
                style={[styles.mi, on && { backgroundColor: colors.purpleTint }]}
                accessibilityRole="menuitem"
                accessibilityState={{ selected: on }}
              >
                <TokenLogo sym={row.k} size={32} />
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }} numberOfLines={1}>
                      {row.pair}
                    </Text>
                    {rowPos.map((p) => (
                      <Tag key={p.id} label={p.side === "long" ? "Long" : "Short"} tone={p.side} />
                    ))}
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.muted }} numberOfLines={1}>
                    Max {row.max}x
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 2 }}>
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text, fontVariant: ["tabular-nums"] }}>
                    {priceFmt(mkPx)}
                  </Text>
                  <Text style={{ fontFamily: font.regular, fontSize: 12, color: ch >= 0 ? colors.positive : colors.negative, fontVariant: ["tabular-nums"] }}>
                    {spct(ch)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </>
      ),
      { width: 320, alignLeft: true },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title={m.pair} />
      <AfterTransition>
        <ScrollView contentContainerStyle={styles.body}>
          {/* V7 Compact Margin Account Strip (.card.px-as) */}
          <Card style={styles.asCard}>
            <View style={styles.asRow}>
              <View style={[styles.asCol, { flex: 1.25 }]}>
                <Text style={[styles.asLabel, { color: colors.muted }]} numberOfLines={1}>
                  Health factor
                </Text>
                <View style={styles.asHfRow}>
                  {has && !nd && <MascotFace hf={a.hf} size={28} />}
                  <Text style={[styles.asVal, { color: hfColor }]} numberOfLines={1}>
                    {!has ? "—" : nd ? "No debt" : hfFmt(a.hf)}
                  </Text>
                </View>
              </View>
              <View style={[styles.asCol, styles.asSep, { borderLeftColor: colors.divider, flex: 0.85 }]}>
                <Text style={[styles.asLabel, { color: colors.muted }]} numberOfLines={1}>
                  Leverage
                </Text>
                <View style={styles.asValWrap}>
                  <Text style={[styles.asVal, { color: colors.text }]} numberOfLines={1}>
                    {has ? levFmt(a.lev) : "—"}
                  </Text>
                </View>
              </View>
              <View style={[styles.asCol, styles.asSep, { borderLeftColor: colors.divider, flex: 0.9 }]}>
                <Text style={[styles.asLabel, { color: colors.muted }]} numberOfLines={1}>
                  Room
                </Text>
                <View style={styles.asValWrap}>
                  <Text style={[styles.asVal, { color: roomColor }]} numberOfLines={1}>
                    {room}
                  </Text>
                </View>
              </View>
              <View style={styles.asActs}>
                <IconAction icon="add" label="Borrow more" tone="tonal" onPress={() => openBorrow(chain)} />
                <IconAction icon="bolt" label="Flash repay" tone="primary" gradient={["#FC5457", "#B6479E"]} onPress={() => openFlash(chain)} />
              </View>
            </View>
          </Card>

          {/* V7 Market Header Row + 4-Column Stats Card (.px-head) */}
          <View style={styles.mktHeadWrap}>
            <View style={styles.mktHeadRow}>
              <Pressable
                ref={mktBtnRef}
                onPress={openMarketMenu}
                style={styles.mktSw}
                accessibilityRole="button"
                accessibilityLabel={`Market ${m.pair}, change`}
              >
                <TokenLogo sym={m.k} size={36} />
                <View style={{ flexShrink: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={[styles.mktPair, { color: colors.text }]} numberOfLines={1}>
                      {m.pair}
                    </Text>
                    <Icon name="expand_more" size={18} color="muted" />
                  </View>
                  <Text style={[styles.mktSub, { color: colors.muted }]} numberOfLines={1}>
                    Phoenix, max {m.max}x
                  </Text>
                </View>
              </Pressable>

              <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                <Text style={[styles.markPrice, { color: colors.text }]}>{priceFmt(price)}</Text>
                <Text style={[styles.cap, { color: ch24 >= 0 ? colors.positive : colors.negative }]}>{spct(ch24)} 24h</Text>
              </View>
            </View>

            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>
                    Index price
                  </Text>
                  <Text style={[styles.statVal, { color: colors.text }]} numberOfLines={1}>
                    {priceFmt(oraclePx)}
                  </Text>
                </View>
                <View style={[styles.statCol, styles.statSep, { borderLeftColor: colors.divider }]}>
                  <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>
                    Funding, 1h
                  </Text>
                  <Text style={[styles.statVal, { color: fund1h >= 0 ? colors.positive : colors.negative }]} numberOfLines={1}>
                    {`${fund1h >= 0 ? "+" : "−"}${nf(Math.abs(fund1h), 4)}%`}
                  </Text>
                  <View style={styles.cdRow}>
                    <Icon name="schedule" size={11} color="muted" />
                    <Text style={[styles.statSub, { color: colors.muted }]}>{cd}</Text>
                  </View>
                </View>
                <View style={[styles.statCol, styles.statSep, { borderLeftColor: colors.divider }]}>
                  <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>
                    Open interest
                  </Text>
                  <Text style={[styles.statVal, { color: colors.text }]} numberOfLines={1}>
                    {"$" + nf(oiUsd / 1e6, 2) + "M"}
                  </Text>
                </View>
                <View style={[styles.statCol, styles.statSep, { borderLeftColor: colors.divider }]}>
                  <Text style={[styles.statLabel, { color: colors.muted }]} numberOfLines={1}>
                    24h volume
                  </Text>
                  <Text style={[styles.statVal, { color: colors.text }]} numberOfLines={1}>
                    {"$" + nf(volUsd / 1e6, 2) + "M"}
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          <Card>
            <View style={[styles.tf, { backgroundColor: colors.segment }]}>
              {TF.map((x) => (
                <Pressable
                  key={x}
                  onPress={() => setTf(x)}
                  style={[styles.tfI, x === tf && { backgroundColor: fam.tab }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: x === tf }}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: x === tf ? "#FFFFFF" : colors.muted }}>{x}</Text>
                </Pressable>
              ))}
            </View>
            <Candles
              k={m.k}
              tf={tf}
              entry={pos[0]?.entry}
              side={pos[0]?.side}
              height={300}
              onFullScreen={() => {
                setFsTicketSide(null);
                setFullScreen(true);
              }}
            />
          </Card>

          {pos.map((p) => (
            <PositionCard key={p.id} p={p} />
          ))}

          <Card style={{ paddingTop: 0 }}>
            <SubTabs items={[["book", "Order book"], ["trades", "Trades"]]} value={book} onChange={setBook} fam={fam} />
            {book === "book" ? <Book book={live.book} price={price} k={m.k} connected={live.connected} /> : <Trades rows={live.trades} />}
          </Card>
        </ScrollView>
      </AfterTransition>

      <View style={[styles.foot, { borderTopColor: colors.divider, backgroundColor: colors.bg }]}>
        <Button label="Long" icon="trending_up" fam={fam} style={{ flex: 1 }} onPress={() => openTicket(m.k, "long")} />
        <Button label="Short" icon="trending_down" fam={{ ...fam, c: ["#FC5457", "#B33C3E"] }} style={{ flex: 1 }} onPress={() => openTicket(m.k, "short")} />
      </View>

      <Modal
        visible={fullScreen}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          if (fsTicketSide) setFsTicketSide(null);
          else setFullScreen(false);
        }}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={[styles.fsHeader, { borderBottomColor: colors.divider }]}>
            <TokenLogo sym={m.k} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>
                {m.pair}
              </Text>
              <Text style={{ fontFamily: font.regular, fontSize: 12, color: ch24 >= 0 ? colors.positive : colors.negative }}>
                {priceFmt(price)} ({spct(ch24)})
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setFsTicketSide(null);
                setFullScreen(false);
              }}
              style={[styles.fsClose, { backgroundColor: colors.segment, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="Close full screen chart"
            >
              <Icon name="close" size={18} color="text" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            <View style={[styles.tf, { backgroundColor: colors.segment }]}>
              {TF.map((x) => (
                <Pressable
                  key={x}
                  onPress={() => setTf(x)}
                  style={[styles.tfI, x === tf && { backgroundColor: fam.tab }]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: x === tf }}
                >
                  <Text style={{ fontFamily: font.semibold, fontSize: 12, color: x === tf ? "#FFFFFF" : colors.muted }}>{x}</Text>
                </Pressable>
              ))}
            </View>
            <Candles
              k={m.k}
              tf={tf}
              entry={pos[0]?.entry}
              side={pos[0]?.side}
              height={fsTicketSide ? 220 : 460}
              isFullScreen
              onFullScreen={() => {
                setFsTicketSide(null);
                setFullScreen(false);
              }}
            />
            {!fsTicketSide && (
              <Card>
                <Book book={live.book} price={price} k={m.k} connected={live.connected} />
              </Card>
            )}
          </ScrollView>

          {fsTicketSide ? (
            <View style={[styles.fsSheet, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <View style={[styles.fsHandle, { backgroundColor: colors.borderControl }]} />
              <View style={styles.fsSheetHead}>
                <Text style={[styles.fsSheetTitle, { color: colors.text }]} accessibilityRole="header">
                  {`${fsTicketSide === "long" ? "Long" : "Short"} ${m.pair}`}
                </Text>
                <Pressable
                  onPress={() => setFsTicketSide(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close order sheet"
                  style={[styles.fsSheetClose, { backgroundColor: colors.segment }]}
                >
                  <Icon name="close" size={20} />
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.fsSheetBody} keyboardShouldPersistTaps="handled" bounces={false}>
                <Ticket
                  key={`${m.k}-${fsTicketSide}`}
                  k={m.k}
                  initial={fsTicketSide}
                  onDone={() => {
                    setFsTicketSide(null);
                    setFullScreen(false);
                  }}
                />
              </ScrollView>
            </View>
          ) : (
            <View style={[styles.foot, { borderTopColor: colors.divider, backgroundColor: colors.bg }]}>
              <Button label="Long" icon="trending_up" fam={fam} style={{ flex: 1 }} onPress={() => setFsTicketSide("long")} />
              <Button
                label="Short"
                icon="trending_down"
                fam={{ ...fam, c: ["#FC5457", "#B33C3E"] }}
                style={{ flex: 1 }}
                onPress={() => setFsTicketSide("short")}
              />
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function Candles({
  k,
  tf,
  entry,
  side,
  height,
  onFullScreen,
  isFullScreen,
}: {
  k: string;
  tf: string;
  entry?: number;
  side?: string;
  height?: number;
  onFullScreen?: () => void;
  isFullScreen?: boolean;
}) {
  const { candles, loadOlder } = usePhoenixCandles(k, tf);
  return <CandleChart symbol={k} tf={tf} candles={candles} entry={entry} side={side} onNearStart={loadOlder} height={height} onFullScreen={onFullScreen} isFullScreen={isFullScreen} />;
}

const BOOK_ROWS = 10;
const pxDec = (v: number) => (v >= 10 ? 2 : 4);

// Phoenix order book: the best 10 asks above and 10 bids below the spread, cumulative size as the depth bar (matching test.vanna.finance).
function Book({ book, price, k, connected }: { book: PhoenixBook | null; price: number; k: string; connected?: boolean }) {
  const { colors } = useTheme();
  if (!book || !book.asks.length || !book.bids.length)
    return <Text style={[styles.cap, { color: colors.muted, paddingVertical: 24, textAlign: "center" }]}>Loading the Phoenix order book</Text>;
  const cum = (lv: [number, number][]) => {
    let tot = 0;
    return lv.slice(0, BOOK_ROWS).map(([p, s]) => ({ p, s, tot: (tot += s) }));
  };
  const asks = cum(book.asks).reverse(), bids = cum(book.bids);
  const max = Math.max(...asks.map((a) => a.tot), ...bids.map((b) => b.tot), 1e-9);
  const d = pxDec(price);
  const bestAsk = book.asks[0][0];
  const bestBid = book.bids[0][0];
  const mid = (bestAsk + bestBid) / 2;
  const spread = Math.max(0, bestAsk - bestBid);
  const spreadPct = bestBid > 0 ? (spread / bestBid) * 100 : 0;
  const markAboveMid = price >= mid;

  const Row = ({ p, s, tot, ask }: { p: number; s: number; tot: number; ask: boolean }) => (
    <View style={styles.br}>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            left: undefined,
            width: `${Math.min(100, (tot / max) * 100)}%`,
            backgroundColor: ask ? "rgba(239,68,68,0.16)" : "rgba(16,185,129,0.15)",
          },
        ]}
      />
      <Text style={[styles.bc, { color: ask ? "#EF4444" : "#10B981", textAlign: "left", fontFamily: font.semibold }]}>{nf(p, d)}</Text>
      <Text style={[styles.bc, { color: colors.text }]}>{nf(s, 3)}</Text>
      <Text style={[styles.bc, { color: colors.text }]}>{nf(tot, 3)}</Text>
    </View>
  );

  return (
    <View style={{ gap: 2, marginTop: 8 }}>
      <View style={[styles.br, { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: 4 }]}>
        {["Price", `Size (${k})`, "Total"].map((h, i) => (
          <Text key={h} style={[styles.bc, { color: colors.muted, textAlign: i === 0 ? "left" : "right" }]}>
            {h}
          </Text>
        ))}
      </View>
      {asks.map((a) => (
        <Row key={"a" + a.p} {...a} ask />
      ))}
      <View style={[styles.spreadRow, { borderTopColor: colors.divider, borderBottomColor: colors.divider }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: markAboveMid ? "#10B981" : "#EF4444", fontVariant: ["tabular-nums"] }}>
            {nf(price, d)}
          </Text>
          <View style={[styles.liveDot, { backgroundColor: connected ? "#10B981" : colors.muted }]} />
        </View>
        <Text style={[styles.cap, { color: colors.muted }]}>
          Spread {nf(spread, d)} · {nf(spreadPct, 3)}%
        </Text>
      </View>
      {bids.map((b) => (
        <Row key={"b" + b.p} {...b} ask={false} />
      ))}
    </View>
  );
}

const clock = (ms: number) => {
  const t = new Date(ms);
  return [t.getHours(), t.getMinutes(), t.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
};

// Latest Phoenix fills: REST seed, then live frames from the trades channel.
function Trades({ rows }: { rows: PhoenixTrade[] }) {
  const { colors } = useTheme();
  if (!rows.length) return <Text style={[styles.cap, { color: colors.muted, paddingVertical: 24, textAlign: "center" }]}>Loading recent trades</Text>;
  return (
    <View style={{ gap: 2, marginTop: 8 }}>
      <View style={[styles.br, { borderBottomWidth: 1, borderBottomColor: colors.divider, paddingBottom: 4 }]}>
        {["Price", "Size", "Time"].map((h, i) => (
          <Text key={h} style={[styles.bc, { color: colors.muted, textAlign: i === 0 ? "left" : "right" }]}>
            {h}
          </Text>
        ))}
      </View>
      {rows.slice(0, 18).map((x) => (
        <View key={x.id} style={styles.br}>
          <Text style={[styles.bc, { color: x.buy ? "#10B981" : "#EF4444", textAlign: "left", fontFamily: font.semibold }]}>{nf(x.price, pxDec(x.price))}</Text>
          <Text style={[styles.bc, { color: colors.text }]}>{nf(x.size, 4)}</Text>
          <Text style={[styles.bc, { color: colors.muted }]}>{clock(x.time)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16, gap: 12, paddingBottom: 24 },
  asCard: { paddingVertical: 10, paddingHorizontal: 12 },
  asRow: { flexDirection: "row", alignItems: "center" },
  asCol: { minWidth: 0, gap: 2, justifyContent: "space-between" },
  asSep: { paddingLeft: 10, marginLeft: 10, borderLeftWidth: 1 },
  asLabel: { fontFamily: font.regular, fontSize: 11, lineHeight: 14 },
  asHfRow: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32 },
  asValWrap: { minHeight: 32, justifyContent: "center" },
  asVal: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, fontVariant: ["tabular-nums", "no-contextual"] },
  asActs: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 8 },
  mktHeadWrap: { gap: 10 },
  mktHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  mktSw: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, flexShrink: 1, minWidth: 0 },
  mktPair: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  mktSub: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  markPrice: { fontFamily: font.semibold, fontSize: 26, lineHeight: 32, letterSpacing: -0.3, fontVariant: ["tabular-nums"] },
  statsCard: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12 },
  statsRow: { flexDirection: "row", alignItems: "flex-start" },
  statCol: { flex: 1, minWidth: 0, gap: 2 },
  statSep: { paddingLeft: 10, marginLeft: 8, borderLeftWidth: 1 },
  statLabel: { fontFamily: font.regular, fontSize: 11, lineHeight: 14 },
  statVal: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums", "no-contextual"] },
  cdRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  statSub: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, fontVariant: ["tabular-nums"] },
  cap: { fontFamily: font.regular, fontSize: 12, fontVariant: ["tabular-nums"] },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  mi: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 12, marginHorizontal: 6, borderRadius: 12 },
  tf: { flexDirection: "row", padding: 4, borderRadius: 12, gap: 2 },
  tfI: { flex: 1, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  br: { flexDirection: "row", alignItems: "center", minHeight: 25, paddingHorizontal: 4, position: "relative" },
  bc: { flex: 1, textAlign: "right", fontFamily: font.regular, fontSize: 12, fontVariant: ["tabular-nums"] },
  spreadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 4, marginVertical: 2, borderTopWidth: 1, borderBottomWidth: 1 },
  foot: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  fsHeader: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  fsClose: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  fsSheet: {
    maxHeight: "58%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -6 },
    elevation: 12,
  },
  fsHandle: { alignSelf: "center", width: 32, height: 4, borderRadius: 2, marginTop: 8, opacity: 0.5 },
  fsSheetHead: { flexDirection: "row", alignItems: "center", paddingLeft: 20, paddingRight: 12, minHeight: 52 },
  fsSheetTitle: { flex: 1, fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  fsSheetClose: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  fsSheetBody: { paddingHorizontal: 16, paddingBottom: 8 },
});
