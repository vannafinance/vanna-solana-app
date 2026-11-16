import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  type SharedValue,
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconAction, Tag } from "@/components/ui/kit";
import { MascotDone } from "@/mascot/mascot";
import { TailLoader } from "@/mascot/tail-loader";
import { refreshAccountSoon } from "@/chain/account-live";
import { onSigned } from "@/chain/sign";
import { tokFmt } from "@/format";
import { type Chain, CHAIN_LABEL } from "@/state/chain";
import { authenticate, lockState } from "@/state/lock";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";

import { toast } from "./overlay";
import type { TxSpec } from "./tx";

/* The margin transaction sheet (design/margin-account-open-flow.html), for up to three deposits and two borrows at once. A wallet with
   no margin account opens it first (one time), then the deposits travel together and the borrows travel together; a wallet that already
   has one deposits and borrows in one transaction. Each step is its own signed transaction: the account card draws in, shimmers while
   the chain creates it, settles with its address and docks into a strip; then each asset flows up from its own node (wallet for a
   deposit, lending pool for a borrow). The last confirmation turns the loader into the done mascot. A step that fails marks its nodes,
   keeps the earlier steps and offers to resume from it. One transaction keeps the app's own done and failure layouts. */

export type FlowAsset = { role: "dep" | "bor"; sym: string; amt: number };
export type Holdings = { col: Record<string, number>; debt: Record<string, number> };

export type TxStep = {
  key: "open" | "deposit" | "borrow" | "both";
  short: string; // stepper label
  title: string; // review, done and failure lists
  desc: string; // first-time review list, second line
  doing: string; // header caption while it runs
  assets: number[]; // indexes into MarginFlow.assets this transaction moves
  send: () => Promise<string | void>;
};

export type MarginFlow = {
  steps: TxStep[];
  assets: FlowAsset[]; // one stage node each
  base: Holdings; // what the account holds before (empty for a new account)
  /** The margin account's address once it exists, or null. */
  accountAddr: () => Promise<string | null>;
};

const short = (a: string) => (a.length > 13 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
const EASE = Easing.bezier(0.2, 0, 0, 1);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const explorer = (h: string) => `https://explorer.solana.com/tx/${h}?cluster=custom&customUrl=${encodeURIComponent("https://rpc-devnet.solana.vanna.finance")}`;

// what the account holds once the first k steps have confirmed
function holdingsAt(f: MarginFlow, k: number): Holdings {
  const h: Holdings = { col: { ...f.base.col }, debt: { ...f.base.debt } };
  f.steps.slice(0, k).forEach((s) =>
    s.assets.forEach((j) => {
      const a = f.assets[j];
      const side = a.role === "dep" ? h.col : h.debt;
      side[a.sym] = (side[a.sym] ?? 0) + a.amt;
    }),
  );
  return h;
}
// one asset reads as its amount, several fold to a count ("3 assets")
const lineOf = (side: Record<string, number>, suffix: string, empty: string) => {
  const k = Object.keys(side);
  return k.length === 0 ? empty : k.length === 1 ? `${tokFmt(side[k[0]], k[0])}${suffix}` : `${k.length} assets${suffix}`;
};
const listOf = (side: Record<string, number>) => Object.keys(side).map((t) => tokFmt(side[t], t)).join(" · ");
const subOf = (f: MarginFlow, s: TxStep) => (s.assets.length > 1 ? s.assets.map((j) => tokFmt(f.assets[j].amt, f.assets[j].sym)).join(" · ") : "");

type Phase = "review" | "run" | "done" | "fail";

export function MarginFlowSheet({ spec, close }: { spec: TxSpec; close: () => void }) {
  const f = spec.flow!;
  const steps = f.steps;
  const isNew = steps[0].key === "open";
  const lite = !isNew && steps.length === 1;
  const { colors } = useTheme();
  const rm = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("review");
  const [cur, setCur] = useState(0); // step being run
  const [sub, setSub] = useState(0); // 0 waiting to sign, 1 sent, 2 processed, 3 confirmed
  const [bad, setBad] = useState(false); // the running step just failed
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));
  const [hashes, setHashes] = useState<string[]>(() => steps.map(() => ""));
  const [addr, setAddr] = useState<string | null>(null);
  const [docked, setDocked] = useState(!isNew);
  const [failIdx, setFailIdx] = useState(0);
  const [failMsg, setFailMsg] = useState("");
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  useEffect(() => {
    if (!isNew) f.accountAddr().then(setAddr).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runFrom = useCallback(
    async (from: number) => {
      setPhase("run");
      setBad(false);
      setFailMsg("");
      const hs = [...hashes];
      for (let i = from; i < steps.length; i++) {
        if (!alive.current) return;
        setCur(i);
        setSub(0);
        const stop = onSigned(() => setSub((s) => Math.max(s, 1)));
        try {
          const h = (await steps[i].send()) || "";
          hs[i] = h;
          setHashes([...hs]);
          setSub(2);
          await sleep(rm ? 0 : 450);
          if (steps[i].key === "open") setAddr((await f.accountAddr().catch(() => null)) ?? null);
          setSub(3);
          setDone((d) => d.map((x, j) => x || j === i));
          haptic.success();
          const last = i === steps.length - 1;
          await sleep(rm ? 0 : last ? 600 : 900);
          if (!last && steps[i].key === "open") {
            setDocked(true);
            await sleep(rm ? 0 : 650);
          }
        } catch (e) {
          stop();
          if (!alive.current) return;
          setFailIdx(i);
          setFailMsg(e instanceof Error ? e.message : "The transaction was not sent");
          setBad(true);
          haptic.error();
          // earlier steps are on chain: re-read the account so the screen (and the next attempt) sees them
          if (hs.some(Boolean)) refreshAccountSoon(spec.chain);
          await sleep(rm ? 0 : 1000);
          setPhase("fail");
          return;
        }
        stop();
      }
      await sleep(rm ? 0 : 900);
      if (!alive.current) return;
      spec.onAllDone?.(hs.filter(Boolean).pop());
      setPhase("done");
    },
    [steps, hashes, f, spec, rm],
  );
  // With "confirm transactions" on (Account > Security), the phone's own prompt runs before the first signature, as in tx.tsx.
  const start = () => {
    if (!lockState().confirmTx) return void runFrom(0);
    authenticate("Confirm transaction")
      .then((ok) => (ok ? void runFrom(0) : toast("Not confirmed")))
      .catch(() => toast("Not confirmed"));
  };

  /* ------------------------------------------------------------- review */
  if (phase === "review") {
    return (
      <View style={{ gap: 12, paddingBottom: 4 }}>
        <View style={[styles.legs, { backgroundColor: colors.bg }]}>
          {spec.legs.map((l, i) => (
            <View key={l.l}>
              {i > 0 && (
                <View style={styles.arrow}>
                  <Icon name="arrow_downward" size={22} color="muted" />
                </View>
              )}
              <Text style={[styles.legL, { color: colors.muted }]}>{l.l}</Text>
              <Text style={[styles.legV, { color: colors.text }]}>{l.v}</Text>
              {l.s && <Text style={[styles.legS, { color: colors.muted }]}>{l.s}</Text>}
            </View>
          ))}
        </View>
        {isNew && (
          <View style={[styles.first, { backgroundColor: colors.purpleTint }]}>
            <Text style={[styles.firstT, { color: colors.text }]}>First time on {CHAIN_LABEL[spec.chain]}</Text>
            <Text style={[styles.firstD, { color: colors.muted }]}>
              Your margin account is opened first. It happens once; after this, each action is a single step.
            </Text>
            <View style={{ marginTop: 12 }}>
              {steps.map((s, i) => (
                <View key={s.key} style={styles.fstep}>
                  {i < steps.length - 1 && <View style={[styles.fline, { backgroundColor: colors.onPurpleTint }]} />}
                  <View style={[styles.num, i === 0 ? { backgroundColor: "#703AE6", borderWidth: 0 } : { borderColor: colors.onPurpleTint }]}>
                    <Text style={[styles.numT, { color: i === 0 ? "#FFFFFF" : colors.onPurpleTint }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <Text style={[styles.stT, { color: colors.text }]}>{s.title}</Text>
                      {i === 0 && (
                        <View style={styles.tag}>
                          <Text style={styles.tagT}>One time</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.stD, { color: colors.muted }]} numberOfLines={2}>{s.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        <View>
          {spec.rows.map(([l, v], i) => (
            <View key={l} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <Text style={[styles.rowL, { color: colors.muted }]}>{l}</Text>
              <Text style={[styles.rowV, { color: colors.text }]} numberOfLines={1}>{v}</Text>
            </View>
          ))}
        </View>
        <Button label={spec.cta} fam={spec.fam} icon={lockState().confirmTx ? (Platform.OS === "ios" ? "face" : "fingerprint") : undefined} onPress={start} />
        {steps.length > 1 && <Text style={[styles.note, { color: colors.muted }]}>{steps.length} transactions, confirmed one after another</Text>}
      </View>
    );
  }

  /* ------------------------------------------------------------- failure */
  if (phase === "fail") {
    // one transaction: the app's own failure layout
    if (steps.length === 1) {
      return (
        <View style={{ gap: 16 }}>
          <View style={styles.hd}>
            <View style={[styles.ring, { backgroundColor: colors.pinkTint }]}>
              <Icon name="close" size={24} color={colors.onPinkTint} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.h, { color: colors.text }]}>Not confirmed</Text>
              <Text style={[styles.cap, { color: colors.muted }]}>{failMsg}</Text>
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <Button label="Try again" fam={spec.fam} onPress={() => (setBad(false), setSub(0), setPhase("review"))} />
            <Button label="Done" v="text" size="md" onPress={() => close()} />
          </View>
        </View>
      );
    }
    const s = steps[failIdx];
    const why =
      isNew && failIdx === 0
        ? `${s.title} didn't go through and nothing was created.`
        : `${s.title} didn't go through and nothing was sent for it. ${isNew ? "Your margin account is open and safe." : "Earlier steps are confirmed."}`;
    return (
      <View style={{ gap: 16 }}>
        <View style={styles.hd}>
          <View style={[styles.ring, { backgroundColor: colors.pinkTint }]}>
            <Icon name="close" size={24} color={colors.onPinkTint} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.h, { color: colors.text }]}>Not confirmed</Text>
            <Text style={[styles.cap, { color: colors.muted }]}>{`${why} ${failMsg}`}</Text>
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          {steps.map((x, j) => {
            const pre = subOf(f, x) ? `${subOf(f, x)} · ` : "";
            return (
              <View key={x.key} style={[styles.trow, j > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                <View style={[styles.ck, j < failIdx ? { backgroundColor: "#703AE6" } : j === failIdx ? { backgroundColor: colors.pinkTint } : { borderWidth: 1, borderColor: colors.borderControl }]}>
                  {j < failIdx ? <Icon name="check" size={16} color="#FFFFFF" /> : j === failIdx ? <Icon name="close" size={14} color={colors.onPinkTint} /> : <Text style={[styles.numT, { color: colors.muted }]}>{j + 1}</Text>}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.stT, { color: colors.text }]}>{j < failIdx && x.key === "open" ? "Account opened" : x.title}</Text>
                  <Text style={[styles.stD, { color: colors.muted }]}>
                    {j < failIdx ? (x.key === "open" ? short(addr ?? "") : pre + short(hashes[j] || "")) : pre + (j === failIdx ? "Didn't go through" : `Runs after step ${failIdx + 1}`)}
                  </Text>
                </View>
                <Tag label={j < failIdx ? "Confirmed" : j === failIdx ? "Not confirmed" : "Waiting"} tone={j < failIdx ? "teal" : j === failIdx ? "neg" : "grey"} />
              </View>
            );
          })}
        </View>
        <Button label={`Try again from step ${failIdx + 1}`} fam={spec.fam} onPress={() => void runFrom(failIdx)} />
      </View>
    );
  }

  /* ------------------------------------------------------------- done */
  if (phase === "done") {
    // one transaction: the app's own done layout (face, title, line, explorer action; the bar; Done)
    if (steps.length === 1) {
      return (
        <View style={{ gap: 20 }}>
          <View style={styles.hd}>
            <MascotDone size={56} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.h, { color: colors.text }]}>{spec.done.title}</Text>
              {!!spec.done.line && <Text style={[styles.cap, { color: colors.muted }]}>{spec.done.line}</Text>}
            </View>
            {!!hashes[0] && <IconAction icon="open_in_new" label="View on Solana Explorer" onPress={() => Linking.openURL(explorer(hashes[0])).catch(() => toast("Couldn't open the explorer"))} />}
          </View>
          <Bar step={3} />
          <Button label="Done" fam={spec.fam} onPress={() => close()} />
        </View>
      );
    }
    const h = holdingsAt(f, steps.length);
    return (
      <View style={{ gap: 20 }}>
        <View style={styles.hd}>
          <MascotDone size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.h, { color: colors.text }]}>{spec.done.title}</Text>
            {!!spec.done.line && <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={2}>{spec.done.line}</Text>}
          </View>
        </View>
        <Bar step={3} />
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          <View style={styles.accRow}>
            <View style={[styles.tile, { overflow: "hidden" }]}>
              <LinearGradient colors={families.margin.c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Icon name="account_balance" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.stT, { color: colors.text }]}>Margin account</Text>
              <Text style={[styles.stD, { color: colors.muted }]} numberOfLines={1}>{CHAIN_LABEL[spec.chain]}{addr ? ` · ${short(addr)}` : ""}</Text>
            </View>
            <Tag label="Open" tone="teal" />
          </View>
          {([["Collateral", h.col], ["Borrowed", h.debt]] as const).map(([l, side]) =>
            Object.keys(side).length ? (
              <View key={l} style={[styles.row, { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                <Text style={[styles.rowL, { color: colors.muted }]}>{l}</Text>
                <Text style={[styles.rowV, styles.multi, { color: colors.text }]}>{listOf(side)}</Text>
              </View>
            ) : null,
          )}
        </View>
        <View>
          <Text style={[styles.sec, { color: colors.muted }]}>{`${steps.length} transactions`}</Text>
          {steps.map((s, i) => (
            <View key={s.key} style={[styles.trow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <View style={[styles.ck, { backgroundColor: "#703AE6" }]}>
                <Icon name="check" size={16} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.stT, { color: colors.text }]}>{s.title}</Text>
                <Text style={[styles.stD, { color: colors.muted }]}>{(subOf(f, s) ? `${subOf(f, s)} · ` : "") + short(hashes[i] || "")}</Text>
              </View>
              {!!hashes[i] && <IconAction icon="open_in_new" label="View on Solana Explorer" onPress={() => Linking.openURL(explorer(hashes[i])).catch(() => toast("Couldn't open the explorer"))} />}
            </View>
          ))}
        </View>
        <Button label="Done" fam={spec.fam} onPress={() => close()} />
      </View>
    );
  }

  /* ------------------------------------------------------------- progress */
  const last = cur === steps.length - 1;
  const finalFace = sub === 3 && last;
  const title = bad ? "Not confirmed" : sub === 0 ? "Sending" : sub === 3 ? "Confirmed" : `Sent to ${CHAIN_LABEL[spec.chain]}`;
  const caption = (steps.length === 1 ? "" : `Step ${cur + 1} of ${steps.length} · `) + steps[cur].doing;
  return (
    <View style={{ gap: 20 }}>
      <Stage chain={spec.chain} flow={f} lite={lite} cur={cur} sub={sub} bad={bad} docked={docked} addr={addr} done={done} />
      {isNew && steps.length > 1 && <Stepper steps={steps} done={done} cur={cur} bad={bad} />}
      <View style={styles.hd}>
        {finalFace ? (
          <MascotDone size={56} />
        ) : bad ? (
          <View style={styles.tl}>
            <View style={[styles.tlBad, { backgroundColor: colors.pinkTint }]}>
              <Icon name="close" size={24} color={colors.onPinkTint} />
            </View>
          </View>
        ) : (
          <TailLoader size={48} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.h, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={2}>{caption}</Text>
        </View>
      </View>
      <Bar step={sub} />
    </View>
  );
}

/* ---------------------------------------------------------------------- progress bar (as tx.tsx) */
function Bar({ step }: { step: number }) {
  const { colors } = useTheme();
  const w = useSharedValue(8);
  useEffect(() => {
    w.value = withTiming([8, 33, 66, 100][step], { duration: 500, easing: EASE });
  }, [step, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.bar, { backgroundColor: colors.divider }]}>
        <Animated.View style={[styles.fill, { backgroundColor: "#703AE6" }, st]} />
      </View>
      <View style={styles.dots}>
        {["Sent", "Processed", "Confirmed"].map((l, i) => (
          <View key={l} style={styles.dt}>
            {i > 0 && <View style={[styles.em, { backgroundColor: colors.border }]} />}
            <View style={[styles.dot, { backgroundColor: step > i ? "#703AE6" : colors.border }]} />
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: step > i ? colors.text : colors.muted }}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ---------------------------------------------------------------------- stepper: a circle per transaction, joined by a line */
function Stepper({ steps, done, cur, bad }: { steps: TxStep[]; done: boolean[]; cur: number; bad: boolean }) {
  const { colors } = useTheme();
  const lit = (i: number) => done[i] || (i === cur && !bad);
  const line = (i: number, show: boolean) => (
    <View style={[styles.spLine, !show ? { opacity: 0 } : { backgroundColor: lit(i) ? "#703AE6" : colors.borderControl, opacity: lit(i) ? 1 : 0.5 }]} />
  );
  return (
    <View style={styles.stepper}>
      {steps.map((s, i) => {
        const d = done[i], isBad = bad && i === cur, on = i === cur && !d && !bad;
        return (
          <View key={s.key} style={styles.sp}>
            <View style={styles.spRow}>
              {line(i, i > 0)}
              <View style={[styles.spc, isBad ? { backgroundColor: colors.pinkTint, borderColor: "transparent" } : d ? { backgroundColor: "#703AE6", borderColor: "#703AE6" } : on ? { borderWidth: 2, borderColor: "#703AE6" } : { borderColor: colors.borderControl }]}>
                {isBad ? <Icon name="close" size={14} color={colors.onPinkTint} /> : d ? <Icon name="check" size={16} color="#FFFFFF" /> : <Text style={[styles.numT, { color: on ? colors.text : colors.muted }]}>{i + 1}</Text>}
              </View>
              {line(i + 1, i < steps.length - 1)}
            </View>
            <Text style={{ fontFamily: on ? font.semibold : font.regular, fontSize: 13, lineHeight: 18, color: on || d ? colors.text : colors.muted }} numberOfLines={1}>{s.short}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------------- stage: account card, nodes, flows */
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const bez = (p: number, a: number, b: number, c: number, d: number) => {
  "worklet";
  const u = 1 - p;
  return u * u * u * a + 3 * u * u * p * b + 3 * u * p * p * c + p * p * p * d;
};

// one particle on the funds path: node (x, top) up to the docked strip (t, sy)
function Particle(p: { clock: SharedValue<number>; i: number; gap: number; delay: number; x: number; t: number; top: number; sy: number; run: boolean; halo: string; core: string }) {
  const { clock, i, gap, delay, x, t, top, sy, run } = p;
  const DUR = 860;
  const pos = useDerivedValue(() => {
    const e = (clock.value - delay - i * gap) / DUR;
    const c = Math.min(1, Math.max(0, e));
    const q = c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
    const o = !run || e <= 0 || e >= 1 ? 0 : Math.min(1, e / 0.15, (1 - e) / 0.14);
    return { x: bez(q, x, x, t, t), y: bez(q, top - 2, top - 34, sy + 34, sy + 2), o };
  });
  const halo = useAnimatedProps(() => ({ cx: pos.value.x, cy: pos.value.y, opacity: pos.value.o * 0.2 }));
  const core = useAnimatedProps(() => ({ cx: pos.value.x, cy: pos.value.y, opacity: pos.value.o }));
  return (
    <>
      <AnimatedCircle animatedProps={halo} r={6.5} fill={p.halo} />
      <AnimatedCircle animatedProps={core} r={2.6} fill={p.core} />
    </>
  );
}

function Stage({
  chain, flow, lite, cur, sub, bad, docked, addr, done,
}: {
  chain: Chain; flow: MarginFlow; lite: boolean; cur: number; sub: number; bad: boolean; docked: boolean; addr: string | null; done: boolean[];
}) {
  const { colors, isDark } = useTheme();
  const rm = useReducedMotion();
  const fam = families.margin;
  const [W, setW] = useState(0);
  const { steps, assets } = flow;
  const isNew = steps[0].key === "open";
  const H = lite ? 166 : 216, top = lite ? 100 : 128, sy = lite ? 56 : 64;
  const openDone = isNew && done[0];
  const running = (i: number) => cur === i && !done[i];
  const stepOf = assets.map((_, j) => steps.findIndex((s) => s.assets.includes(j)));

  // account card: forming (open step sent) -> settled (open confirmed) -> docked
  const form = useSharedValue(0);
  const fill = useSharedValue(openDone || !isNew ? 1 : 0);
  const dock = useSharedValue(docked ? 1 : 0);
  const shim = useSharedValue(0);
  const recv = useSharedValue(0);
  useEffect(() => {
    form.value = withTiming(isNew && running(0) && sub >= 1 && !bad ? 1 : 0, { duration: 350 });
    if (!rm) shim.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1);
  }, [cur, sub, done, bad, rm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fill.value = withTiming(openDone || !isNew ? 1 : 0, { duration: 600, easing: EASE });
  }, [openDone]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    dock.value = withTiming(docked ? 1 : 0, { duration: rm ? 0 : 650, easing: EASE });
  }, [docked, rm]); // eslint-disable-line react-hooks/exhaustive-deps

  // flows: every asset of the running step streams up from its node
  const clock = useSharedValue(0);
  const flowing = !bad && (sub === 1 || sub === 2) && steps[cur].assets.length > 0;
  const many = steps[cur].assets.length > 1;
  const loop = 7 * 170 + 860 + 300 + assets.length * 110;
  useEffect(() => {
    recv.value = withTiming(flowing ? 1 : 0, { duration: 300 });
    if (flowing && !rm) {
      clock.value = 0;
      clock.value = withRepeat(withTiming(loop, { duration: loop, easing: Easing.linear }), -1);
    } else cancelAnimation(clock);
  }, [flowing, cur, rm]); // eslint-disable-line react-hooks/exhaustive-deps

  // strip lines: a single landing asset counts up when its step confirms, then the line settles (several fold to "3 assets")
  const k = done.filter(Boolean).length;
  const seen = useRef(k);
  const [held, setHeld] = useState(() => holdingsAt(flow, k));
  const [tick, setTick] = useState<{ col?: [string, number]; debt?: [string, number] }>({});
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (k <= seen.current) return;
    const before = holdingsAt(flow, seen.current), after = holdingsAt(flow, k);
    const moved = steps.slice(seen.current, k).flatMap((s) => s.assets.map((j) => assets[j]));
    seen.current = k;
    setHeld(after);
    setFlash(true);
    const fl = setTimeout(() => setFlash(false), 650);
    const ids: ReturnType<typeof setInterval>[] = [];
    if (!rm) {
      (["col", "debt"] as const).forEach((side) => {
        const a = moved.filter((x) => (x.role === "dep") === (side === "col"));
        if (a.length !== 1 || Object.keys(after[side]).length !== 1) return;
        const sym = a[0].sym, from = before[side][sym] ?? 0, to = after[side][sym];
        const t0 = Date.now();
        const id = setInterval(() => {
          const p = Math.min(1, (Date.now() - t0) / 900);
          setTick((tk) => ({ ...tk, [side]: p >= 1 ? undefined : [sym, from + (to - from) * (1 - Math.pow(1 - p, 3))] }));
          if (p >= 1) clearInterval(id);
        }, 32);
        ids.push(id);
      });
    }
    return () => (clearTimeout(fl), ids.forEach(clearInterval));
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle = useAnimatedStyle(() => ({
    left: interpolate(dock.value, [0, 1], [W / 2 - 116, 0]),
    width: interpolate(dock.value, [0, 1], [232, W]),
    top: interpolate(dock.value, [0, 1], [38, 0]),
    height: interpolate(dock.value, [0, 1], [140, sy]),
  }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const outline = useAnimatedStyle(() => ({ opacity: interpolate(fill.value, [0, 1], [1, 0]), borderColor: form.value > 0.5 ? "#B6479E" : colors.borderControl }));
  const big = useAnimatedStyle(() => ({ opacity: interpolate(dock.value, [0, 0.4], [1, 0], "clamp") }));
  const strip = useAnimatedStyle(() => ({ opacity: interpolate(dock.value, [0.6, 1], [0, 1], "clamp") }));
  const shimmer = useAnimatedStyle(() => ({
    opacity: form.value * (1 - fill.value) * 0.9,
    transform: [{ translateX: interpolate(shim.value, [0, 1], [-232, 232]) }],
  }));
  const sheen = useAnimatedStyle(() => ({ opacity: recv.value, transform: [{ translateX: interpolate(shim.value, [0, 1], [-W, W]) }] }));

  const n = assets.length;
  const slot = W / Math.max(n, 1);
  const nodeW = Math.min(104, Math.floor(slot) - 4);
  const spread = n > 1 ? Math.min(26, W / (n * 2 + 1)) : 0;
  const xs = assets.map((_, j) => Math.round(slot * (j + 0.5)));
  const ts = assets.map((_, j) => W / 2 + (j - (n - 1) / 2) * spread);
  const path = (j: number) => `M${xs[j]} ${top - 2}C${xs[j]} ${top - 34} ${ts[j]} ${sy + 34} ${ts[j]} ${sy + 2}`;
  const few = n === 1 || (n === 2 && assets[0].role !== assets[1].role);
  const nodeState = (j: number): "idle" | "on" | "done" | "bad" => {
    const s = stepOf[j];
    if (s < 0) return "idle";
    if (done[s]) return "done";
    if (s === cur && bad) return "bad";
    return docked && running(s) ? "on" : "idle";
  };
  const addrText = addr ? short(addr) : "…";
  const colLine = tick.col ? tokFmt(tick.col[1], tick.col[0]) : lineOf(held.col, "", isNew && !assets.some((a) => a.role === "dep") ? "Open" : "No collateral yet");
  const debtLine = tick.debt ? `${tokFmt(tick.debt[1], tick.debt[0])} borrowed` : lineOf(held.debt, " borrowed", "");
  const lineColor = flash ? "#BFF6FA" : "#FFFFFF";
  return (
    <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {W > 0 && (
        <>
          <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
            {assets.map((_, j) => (
              <Path key={`b${j}`} d={path(j)} stroke={colors.borderControl} strokeWidth={2} strokeLinecap="round" strokeDasharray={[0, 6]} fill="none" opacity={docked ? 0.8 : 0} />
            ))}
            {assets.map((_, j) => (
              <FlowLine key={`f${j}`} d={path(j)} state={nodeState(j)} />
            ))}
            {steps[cur].assets.map((j, q) =>
              [...Array(many ? 5 : 7).keys()].map((i) => (
                <Particle key={`p${j}-${i}`} clock={clock} i={i} gap={many ? 170 : 140} delay={q * 110} x={xs[j]} t={ts[j]} top={top} sy={sy} run={flowing} halo={isDark ? "#CBB6FA" : "#8D61EB"} core={isDark ? "#FFFFFF" : "#703AE6"} />
              )),
            )}
          </Svg>
          {assets.map((a, j) => {
            const amt = tokFmt(a.amt, a.sym);
            const l1 = lite ? (few ? amt : a.sym) : few ? (a.role === "dep" ? "Your wallet" : "Lending pool") : a.sym;
            const l2 = lite ? "" : few ? amt : amt.slice(0, -a.sym.length - 1);
            return <Node key={j} x={xs[j]} w={nodeW} top={top} lite={lite} icon={a.role === "dep" ? "account_balance_wallet" : "account_balance"} l1={l1} l2={l2} state={nodeState(j)} shown={docked} />;
          })}
          <Animated.View style={[styles.acct, cardStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.outline, outline]} />
            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: "hidden" }, fillStyle]}>
              <LinearGradient colors={fam.h} locations={[0, 0.42, 1]} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View style={[styles.shimmerWrap, shimmer]} pointerEvents="none">
              <LinearGradient colors={["transparent", "rgba(141,97,235,0.14)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, sheen]} pointerEvents="none">
              <LinearGradient colors={["transparent", "rgba(255,255,255,0.28)", "transparent"]} start={{ x: 0.35, y: 0 }} end={{ x: 0.65, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            {/* big card */}
            <Animated.View style={[styles.big, big]}>
              <View style={styles.bTop}>
                <Text style={[styles.bK, { color: openDone ? "rgba(255,255,255,0.85)" : colors.muted }]}>Margin account</Text>
                <View style={[styles.bChain, { backgroundColor: openDone ? "rgba(255,255,255,0.18)" : colors.divider }]}>
                  <Text style={[styles.bChainT, { color: openDone ? "#FFFFFF" : colors.muted }]}>{CHAIN_LABEL[chain]}</Text>
                </View>
              </View>
              <View>
                {openDone ? (
                  <Text style={styles.bAddr}>{addrText}</Text>
                ) : (
                  <View style={styles.skelRow}>
                    <View style={[styles.skel, { width: 136, backgroundColor: colors.border }]} />
                    <View style={[styles.skel, { width: 56, backgroundColor: colors.border, opacity: 0.6 }]} />
                  </View>
                )}
                <View style={styles.bMetaRow}>
                  <View style={[styles.bDot, { backgroundColor: openDone ? "#32EEE2" : sub >= 1 && cur === 0 ? "#703AE6" : colors.borderControl }]} />
                  <Text style={[styles.bMeta, { color: openDone ? "rgba(255,255,255,0.85)" : colors.muted }]}>
                    {openDone ? "Opened just now" : sub >= 1 && cur === 0 ? `Creating on ${CHAIN_LABEL[chain]}` : "Waiting to sign"}
                  </Text>
                </View>
              </View>
            </Animated.View>
            {/* docked strip: the address never shrinks, the balance side truncates */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.strip, strip]}>
              <View style={[styles.sIc, lite && { width: 28, height: 28, borderRadius: 9 }]}>
                <Icon name="account_balance" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flexShrink: 0 }}>
                <Text style={styles.sK}>Margin account</Text>
                <Text style={styles.sA}>{addrText}</Text>
              </View>
              <View style={styles.sR}>
                <Text style={[styles.sV, { color: lineColor }]} numberOfLines={1}>{colLine}</Text>
                {!!debtLine && <Text style={[styles.sV2, flash && { color: lineColor }]} numberOfLines={1}>{debtLine}</Text>}
              </View>
            </Animated.View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

function FlowLine({ d, state }: { d: string; state: "idle" | "on" | "done" | "bad" }) {
  const { colors } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(state === "idle" ? 0 : 1, { duration: 550, easing: EASE });
  }, [state, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: (1 - p.value) * 400 }));
  return (
    <AnimatedPath
      animatedProps={props}
      d={d}
      stroke={state === "bad" ? colors.onPinkTint : colors.link}
      opacity={state === "done" ? 0.3 : state === "bad" ? 0.6 : 0.9}
      strokeWidth={2}
      strokeLinecap="round"
      fill="none"
      strokeDasharray={[400, 400]}
    />
  );
}

function Node({ x, w, top, lite, icon, l1, l2, state, shown }: { x: number; w: number; top: number; lite: boolean; icon: "account_balance_wallet" | "account_balance"; l1: string; l2: string; state: "idle" | "on" | "done" | "bad"; shown: boolean }) {
  const { colors } = useTheme();
  const lit = state === "on" || state === "bad";
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = withTiming(!shown ? 0 : lit ? 1 : 0.55, { duration: 450, easing: EASE });
  }, [shown, lit, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ translateY: interpolate(o.value, [0, 0.55], [8, 0], "clamp") }] }));
  const size = lite ? 36 : 44;
  return (
    <Animated.View style={[styles.node, { left: x - w / 2, width: w, top }, st]}>
      <View style={{ width: size, height: size, marginBottom: 6 }}>
        {lit && <View style={[styles.halo, { borderRadius: (size + 10) / 2, backgroundColor: state === "bad" ? colors.pinkTint : "rgba(112,58,230,0.18)" }]} />}
        <View style={[styles.nc, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.bg, borderColor: state === "bad" ? colors.onPinkTint : state === "on" ? "#703AE6" : colors.border }]}>
          <Icon name={icon} size={lite ? 18 : 20} />
        </View>
        {state === "done" && (
          <View style={[styles.nok, { borderColor: colors.surface }]}>
            <Icon name="check" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={[styles.nl, { color: colors.text }]} numberOfLines={1}>{l1}</Text>
      {!!l2 && <Text style={[styles.nv, { color: colors.muted }]} numberOfLines={1}>{l2}</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  legs: { borderRadius: 16, padding: 16 },
  arrow: { alignItems: "center", paddingVertical: 4 },
  legL: { fontFamily: font.regular, fontSize: 13 },
  legV: { fontFamily: font.semibold, fontSize: 22, lineHeight: 30, fontVariant: ["tabular-nums"] },
  legS: { fontFamily: font.regular, fontSize: 12, fontVariant: ["tabular-nums"] },
  first: { borderRadius: 16, padding: 16 },
  firstT: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  firstD: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, marginTop: 4 },
  fstep: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 6 },
  fline: { position: "absolute", left: 11.5, top: 32, bottom: -6, width: 1, opacity: 0.3 },
  num: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", marginTop: 1 },
  numT: { fontFamily: font.semibold, fontSize: 12 },
  stT: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  stD: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
  tag: { paddingHorizontal: 8, borderRadius: 9, backgroundColor: "#703AE6" },
  tagT: { fontFamily: font.semibold, fontSize: 11, lineHeight: 18, color: "#FFFFFF" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  rowL: { fontFamily: font.regular, fontSize: 14 },
  rowV: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  multi: { lineHeight: 20, paddingVertical: 12 },
  note: { textAlign: "center", fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  h: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28 },
  cap: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  hd: { flexDirection: "row", alignItems: "center", gap: 14 },
  ring: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  tl: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  tlBad: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 16, paddingHorizontal: 16 },
  accRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60 },
  trow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 8 },
  ck: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sec: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  bar: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8, flexWrap: "wrap" },
  dt: { flexDirection: "row", alignItems: "center", gap: 6 },
  em: { width: 20, height: 1, marginRight: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stepper: { flexDirection: "row", alignItems: "flex-start" },
  sp: { flex: 1, minWidth: 0, alignItems: "center", gap: 6 },
  spRow: { flexDirection: "row", alignItems: "center", alignSelf: "stretch" },
  spLine: { flex: 1, height: 1, marginHorizontal: 6 },
  spc: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  acct: { position: "absolute", borderRadius: 16, overflow: "hidden" },
  outline: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 16 },
  shimmerWrap: { ...StyleSheet.absoluteFill, width: 120 },
  big: { position: "absolute", left: 0, top: 0, width: 232, height: 140, padding: 16, justifyContent: "space-between" },
  bTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  bK: { fontFamily: font.regular, fontSize: 12 },
  bChain: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  bChainT: { fontFamily: font.semibold, fontSize: 11 },
  bAddr: { fontFamily: font.semibold, fontSize: 20, lineHeight: 26, color: "#FFFFFF", letterSpacing: 0.4 },
  skelRow: { flexDirection: "row", gap: 8, height: 26, alignItems: "center" },
  skel: { height: 14, borderRadius: 7 },
  bMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  bDot: { width: 6, height: 6, borderRadius: 3 },
  bMeta: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  strip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 },
  sIc: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  sK: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: "rgba(255,255,255,0.82)" },
  sA: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, color: "#FFFFFF" },
  sR: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  sV: { fontFamily: font.semibold, fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums"], maxWidth: "100%" },
  sV2: { fontFamily: font.regular, fontSize: 11, lineHeight: 14, color: "rgba(255,255,255,0.82)", fontVariant: ["tabular-nums"], maxWidth: "100%" },
  node: { position: "absolute", alignItems: "center" },
  halo: { position: "absolute", left: -5, top: -5, right: -5, bottom: -5 },
  nc: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  nok: { position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, borderWidth: 2, backgroundColor: "#703AE6", alignItems: "center", justifyContent: "center" },
  nl: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  nv: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
});
