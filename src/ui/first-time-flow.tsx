import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  type SharedValue,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { MascotDone } from "@/mascot/mascot";
import { TailLoader } from "@/mascot/tail-loader";
import { onSigned } from "@/chain/sign";
import { type Chain, CHAIN_LABEL } from "@/state/chain";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";

import type { TxSpec } from "./tx";

/* The first-time sheet (design/margin-account-open-flow.html): when a wallet has no margin account, the account is opened first, then the
   deposit, then the borrow. Each step is its own signed transaction, so the sheet walks through them: the account card draws in, shimmers
   while the chain creates it, settles with its address and docks into a strip; then funds flow in from the wallet (deposit) and from the
   lending pool (borrow). The last confirmation turns the loader into the done mascot. A step that fails leaves the open account where it
   is and offers to resume from that step. */

export type TxStep = {
  key: "open" | "deposit" | "borrow" | "both";
  short: string; // stepper label
  title: string; // review list
  desc: string; // review list, second line
  doing: string; // header caption while it runs
  send: () => Promise<string | void>;
};

export type FirstTime = {
  steps: TxStep[];
  /** The margin account's address once it exists (read after the open step), or null. */
  accountAddr: () => Promise<string | null>;
  dep?: { label: string }; // e.g. "2,100 XLM", drives the wallet node and the strip balance
  bor?: { label: string };
};

const STAGE_H = 216;
const BRAND = ["#FC5457", "#B6479E", "#703AE6"];
const short = (a: string) => (a.length > 13 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);
const EASE = Easing.bezier(0.2, 0, 0, 1);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

type Phase = "review" | "run" | "done" | "fail";

export function FirstTimeFlow({ spec, close }: { spec: TxSpec; close: () => void }) {
  const ft = spec.firstTime!;
  const steps = ft.steps;
  const { colors } = useTheme();
  const fam = families.margin;
  const rm = useReducedMotion();

  const [phase, setPhase] = useState<Phase>("review");
  const [cur, setCur] = useState(0); // step being run
  const [sub, setSub] = useState(0); // 0 waiting to sign, 1 sent, 2 processed, 3 confirmed
  const [done, setDone] = useState<boolean[]>(() => steps.map(() => false));
  const [hashes, setHashes] = useState<string[]>(() => steps.map(() => ""));
  const [addr, setAddr] = useState<string | null>(null);
  const [docked, setDocked] = useState(false);
  const [failIdx, setFailIdx] = useState(0);
  const [failMsg, setFailMsg] = useState("");
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);

  const runFrom = useCallback(
    async (from: number) => {
      setPhase("run");
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
          if (steps[i].key === "open") setAddr((await ft.accountAddr().catch(() => null)) ?? null);
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
          if (steps[i].key !== "open") setDocked(true);
          await sleep(rm ? 0 : 500);
          setPhase("fail");
          haptic.error();
          return;
        }
        stop();
      }
      await sleep(rm ? 0 : 900);
      if (!alive.current) return;
      spec.onAllDone?.(hs.filter(Boolean).pop());
      setPhase("done");
    },
    [steps, hashes, ft, spec, rm],
  );

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
        <View style={[styles.first, { backgroundColor: colors.purpleTint }]}>
          <Text style={[styles.firstT, { color: colors.text }]}>First time on {CHAIN_LABEL[spec.chain]}</Text>
          <Text style={[styles.firstD, { color: colors.muted }]}>
            Your margin account is opened first. It happens once; after this, each action is a single step.
          </Text>
          {steps.map((s, i) => (
            <View key={s.key} style={styles.fstep}>
              <View style={[styles.num, { borderColor: fam.ink }]}>
                <Text style={[styles.numT, { color: fam.ink }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={[styles.stT, { color: colors.text }]} numberOfLines={1}>{s.title}</Text>
                  {i === 0 && (
                    <View style={[styles.tag, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.tagT, { color: fam.ink }]}>One time</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.stD, { color: colors.muted }]} numberOfLines={2}>{s.desc}</Text>
              </View>
            </View>
          ))}
        </View>
        <View>
          {spec.rows.map(([l, v], i) => (
            <View key={l} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <Text style={[styles.rowL, { color: colors.muted }]}>{l}</Text>
              <Text style={[styles.rowV, { color: colors.text }]}>{v}</Text>
            </View>
          ))}
        </View>
        <Button label={spec.cta} fam={spec.fam} onPress={() => void runFrom(0)} />
        {steps.length > 1 && <Text style={[styles.note, { color: colors.muted }]}>{steps.length} transactions, confirmed one after another</Text>}
      </View>
    );
  }

  /* ------------------------------------------------------------- failure */
  if (phase === "fail") {
    const s = steps[failIdx];
    return (
      <View style={{ gap: 16 }}>
        <View style={styles.hd}>
          <View style={[styles.ring, { backgroundColor: colors.pinkTint }]}>
            <Icon name="close" size={24} color={colors.onPinkTint} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.h, { color: colors.text }]}>Not confirmed</Text>
            <Text style={[styles.cap, { color: colors.muted }]}>
              {failIdx === 0
                ? `${s.short} didn't go through and nothing was created. ${failMsg}`
                : `${s.short} didn't go through. Your margin account is open and safe. ${failMsg}`}
            </Text>
          </View>
        </View>
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          {steps.map((x, j) => (
            <View key={x.key} style={[styles.trow, j > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <View style={[styles.ck, j < failIdx ? { backgroundColor: fam.ink } : j === failIdx ? { backgroundColor: colors.pinkTint } : { borderWidth: 1.5, borderColor: colors.border }]}>
                {j < failIdx ? <Icon name="check" size={14} color="#FFFFFF" /> : j === failIdx ? <Icon name="close" size={14} color={colors.onPinkTint} /> : <Text style={[styles.numT, { color: colors.muted }]}>{j + 1}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.stT, { color: colors.text }]} numberOfLines={1}>{j === 0 && j < failIdx ? "Account opened" : x.title}</Text>
                <Text style={[styles.stD, { color: colors.muted }]} numberOfLines={1}>
                  {j < failIdx ? (j === 0 && addr ? short(addr) : short(hashes[j] || "")) : j === failIdx ? "Not confirmed" : `Runs after step ${failIdx + 1}`}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Button label={`Try again from step ${failIdx + 1}`} fam={spec.fam} onPress={() => void runFrom(failIdx)} />
      </View>
    );
  }

  /* ------------------------------------------------------------- done */
  if (phase === "done") {
    const url = (h: string) => (spec.chain === "stellar" ? `https://stellar.expert/explorer/testnet/tx/${h}` : `https://explorer.solana.com/tx/${h}?cluster=custom&customUrl=${encodeURIComponent("https://rpc-devnet.solana.vanna.finance")}`);
    return (
      <View style={{ gap: 20 }}>
        <View style={styles.hd}>
          <MascotDone size={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.h, { color: colors.text }]}>{spec.done.title}</Text>
            {spec.done.line && <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={2}>{spec.done.line}</Text>}
          </View>
        </View>
        <Bar step={3} />
        <View style={[styles.card, { backgroundColor: colors.bg }]}>
          <View style={styles.trow}>
            <View style={[styles.tile, { overflow: "hidden" }]}>
              <LinearGradient colors={fam.c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Icon name="account_balance" size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.stT, { color: colors.text }]}>Margin account</Text>
              <Text style={[styles.stD, { color: colors.muted }]} numberOfLines={1}>{CHAIN_LABEL[spec.chain]}{addr ? ` · ${short(addr)}` : ""}</Text>
            </View>
          </View>
        </View>
        <View>
          <Text style={[styles.sec, { color: colors.muted }]}>{steps.length === 1 ? "1 transaction" : `${steps.length} transactions`}</Text>
          {steps.map((s, i) => (
            <View key={s.key} style={styles.trow}>
              <View style={[styles.ck, { backgroundColor: fam.ink }]}>
                <Icon name="check" size={14} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.stT, { color: colors.text }]}>{s.short}</Text>
                <Text style={[styles.stD, { color: colors.muted }]} numberOfLines={1}>{short(hashes[i] || "")}</Text>
              </View>
              {!!hashes[i] && (
                <Pressable onPress={() => Linking.openURL(url(hashes[i])).catch(() => {})} hitSlop={10} accessibilityRole="link" accessibilityLabel="View transaction">
                  <Icon name="open_in_new" size={20} color="muted" />
                </Pressable>
              )}
            </View>
          ))}
        </View>
        <Button label="Done" fam={spec.fam} onPress={() => close()} />
      </View>
    );
  }

  /* ------------------------------------------------------------- progress */
  const last = cur === steps.length - 1;
  const confirmed = sub === 3;
  const finalFace = confirmed && last;
  const key = steps[cur].key;
  const title = sub === 0 ? "Sending" : sub === 3 ? "Confirmed" : `Sent to ${CHAIN_LABEL[spec.chain]}`;
  const caption = (steps.length === 1 ? "" : `Step ${cur + 1} of ${steps.length} · `) + steps[cur].doing;
  return (
    <View style={{ gap: 20 }}>
      <Stage chain={spec.chain} cur={cur} sub={sub} docked={docked} addr={addr} steps={steps} done={done} depLabel={ft.dep?.label} borLabel={ft.bor?.label} fam={fam} />
      {steps.length > 1 && <Stepper steps={steps} done={done} cur={cur} />}
      <View style={styles.hd}>
        {finalFace ? <MascotDone size={56} /> : <TailLoader size={48} />}
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

/* ---------------------------------------------------------------------- stepper */
function Stepper({ steps, done, cur }: { steps: TxStep[]; done: boolean[]; cur: number }) {
  const { colors } = useTheme();
  const fam = families.margin;
  return (
    <View style={styles.stepper}>
      {steps.map((s, i) => {
        const d = done[i], on = i === cur && !d;
        return (
          <View key={s.key} style={styles.sp}>
            <View style={[styles.spc, d ? { backgroundColor: fam.ink, borderColor: fam.ink } : { borderColor: on ? fam.ink : colors.border }]}>
              {d ? <Icon name="check" size={14} color="#FFFFFF" /> : <Text style={[styles.numT, { color: on ? fam.ink : colors.muted }]}>{i + 1}</Text>}
            </View>
            <Text style={{ fontFamily: on || d ? font.semibold : font.regular, fontSize: 12, color: on || d ? colors.text : colors.muted }} numberOfLines={1}>{s.short}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ---------------------------------------------------------------------- stage: account card, nodes, flows */
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// the funds path: node (x, 126) up to the docked strip (t, 66)
const bez = (p: number, a: number, b: number, c: number, d: number) => {
  "worklet";
  const u = 1 - p;
  return u * u * u * a + 3 * u * u * p * b + 3 * u * p * p * c + p * p * p * d;
};

function Particle({ clock, i, x, t, run }: { clock: SharedValue<number>; i: number; x: number; t: number; run: boolean }) {
  const GAP = 140, DUR = 860;
  const cx = useDerivedValue(() => {
    const e = clock.value - i * GAP;
    const p = Math.min(1, Math.max(0, e / DUR));
    const q = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    return bez(q, x, x, t, t);
  });
  const cy = useDerivedValue(() => {
    const e = clock.value - i * GAP;
    const p = Math.min(1, Math.max(0, e / DUR));
    const q = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    return bez(q, 126, 94, 100, 66);
  });
  const op = useDerivedValue(() => {
    const e = clock.value - i * GAP;
    const p = e / DUR;
    if (!run || p <= 0 || p >= 1) return 0;
    return Math.min(1, p / 0.15, (1 - p) / 0.14);
  });
  const halo = useAnimatedProps(() => ({ cx: cx.value, cy: cy.value, opacity: op.value * 0.28 }));
  const core = useAnimatedProps(() => ({ cx: cx.value, cy: cy.value, opacity: op.value }));
  return (
    <>
      <AnimatedCircle animatedProps={halo} r={6.5} fill="#B6479E" />
      <AnimatedCircle animatedProps={core} r={2.6} fill="#FFFFFF" />
    </>
  );
}

function Stage({
  chain, cur, sub, docked, addr, steps, done, depLabel, borLabel, fam,
}: {
  chain: Chain; cur: number; sub: number; docked: boolean; addr: string | null; steps: TxStep[]; done: boolean[]; depLabel?: string; borLabel?: string; fam: (typeof families)["margin"];
}) {
  const { colors } = useTheme();
  const rm = useReducedMotion();
  const [W, setW] = useState(0);
  const hasDep = steps.some((s) => s.key === "deposit" || s.key === "both");
  const hasBor = steps.some((s) => s.key === "borrow");
  const iDep = steps.findIndex((s) => s.key === "deposit" || s.key === "both");
  const iBor = steps.findIndex((s) => s.key === "borrow");
  const openDone = done[0] && steps[0].key === "open";
  const running = (i: number) => cur === i && !done[i];

  // account card: forming (open step running) -> settled (open confirmed) -> docked
  const form = useSharedValue(0);
  const fill = useSharedValue(0);
  const dock = useSharedValue(0);
  const shim = useSharedValue(0);
  useEffect(() => {
    form.value = withTiming(running(0) && steps[0].key === "open" ? 1 : 0, { duration: 350 });
    if (!rm) shim.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1);
  }, [cur, done, rm]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fill.value = withTiming(openDone || steps[0].key !== "open" ? 1 : 0, { duration: 600, easing: EASE });
  }, [openDone]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    dock.value = withTiming(docked ? 1 : 0, { duration: rm ? 0 : 650, easing: EASE });
  }, [docked, rm]); // eslint-disable-line react-hooks/exhaustive-deps

  // flows
  const clock = useSharedValue(0);
  const flowing = (sub === 1 || sub === 2) && ((iDep === cur && hasDep) || (iBor === cur && hasBor));
  useEffect(() => {
    if (flowing && !rm) {
      clock.value = 0;
      clock.value = withRepeat(withTiming(7 * 140 + 860 + 300, { duration: 7 * 140 + 860 + 300, easing: Easing.linear }), -1);
    }
  }, [flowing, cur, rm]); // eslint-disable-line react-hooks/exhaustive-deps

  // balances count up when each leg confirms
  const [depN, setDepN] = useState(0);
  const [borN, setBorN] = useState(0);
  const depTotal = useMemo(() => parseFloat((depLabel ?? "0").replace(/,/g, "")) || 0, [depLabel]);
  const borTotal = useMemo(() => parseFloat((borLabel ?? "0").replace(/,/g, "")) || 0, [borLabel]);
  const tween = useCallback((to: number, set: (n: number) => void) => {
    if (rm) return set(to);
    const t0 = Date.now(), D = 900;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / D);
      set(to * (1 - Math.pow(1 - p, 3)));
      if (p >= 1) clearInterval(id);
    }, 32);
    return () => clearInterval(id);
  }, [rm]);
  useEffect(() => {
    if (iDep >= 0 && done[iDep]) tween(depTotal, setDepN);
  }, [done[iDep]]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (iBor >= 0 && done[iBor]) tween(borTotal, setBorN);
  }, [done[iBor]]); // eslint-disable-line react-hooks/exhaustive-deps

  const cardStyle = useAnimatedStyle(() => ({
    left: interpolate(dock.value, [0, 1], [W / 2 - 94, 0]),
    width: interpolate(dock.value, [0, 1], [188, W]),
    top: interpolate(dock.value, [0, 1], [14, 6]),
    height: interpolate(dock.value, [0, 1], [116, 64]),
    borderRadius: interpolate(dock.value, [0, 1], [20, 16]),
  }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }));
  const outline = useAnimatedStyle(() => ({ opacity: interpolate(fill.value, [0, 1], [1, 0]), borderColor: form.value > 0.5 ? "#B6479E" : colors.border }));
  const big = useAnimatedStyle(() => ({ opacity: interpolate(dock.value, [0, 0.4], [1, 0], "clamp") * fill.value }));
  const strip = useAnimatedStyle(() => ({ opacity: interpolate(dock.value, [0.6, 1], [0, 1], "clamp") }));
  const shimmer = useAnimatedStyle(() => ({
    opacity: form.value * (1 - fill.value) * 0.9,
    transform: [{ translateX: interpolate(shim.value, [0, 1], [-188, 188]) }],
  }));

  const xs = hasBor ? [Math.round(W * 0.2), Math.round(W * 0.8)] : [Math.round(W / 2)];
  const ts = hasBor ? [W / 2 - 34, W / 2 + 34] : [W / 2];
  const path = (x: number, t: number) => `M${x} 126C${x} 94 ${t} 100 ${t} 66`;
  const nodeOn = (i: number) => docked && i >= 0 && (running(i) || done[i]);
  const addrText = addr ? short(addr) : "…";
  return (
    <View style={{ height: STAGE_H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {W > 0 && (
        <>
          <Svg width={W} height={STAGE_H} style={StyleSheet.absoluteFill}>
            {hasDep && <Path d={path(xs[0], ts[0])} stroke={colors.divider} strokeWidth={2} fill="none" />}
            {hasBor && <Path d={path(xs[1], ts[1])} stroke={colors.divider} strokeWidth={2} fill="none" />}
            {hasDep && <FlowLine d={path(xs[0], ts[0])} on={nodeOn(iDep) } doneNow={done[iDep]} />}
            {hasBor && <FlowLine d={path(xs[1], ts[1])} on={nodeOn(iBor)} doneNow={done[iBor]} />}
            {hasDep && iDep === cur && <ParticleGroup clock={clock} x={xs[0]} t={ts[0]} run={flowing} />}
            {hasBor && iBor === cur && <ParticleGroup clock={clock} x={xs[1]} t={ts[1]} run={flowing} />}
          </Svg>
          {hasDep && <Node x={xs[0]} icon="account_balance_wallet" label="Your wallet" value={depLabel ?? ""} on={nodeOn(iDep)} done={!!done[iDep]} />}
          {hasBor && <Node x={xs[1]} icon="account_balance" label="Lending pool" value={borLabel ?? ""} on={nodeOn(iBor)} done={!!done[iBor]} />}
          <Animated.View style={[styles.acct, cardStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.outline, outline]} />
            <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: 20, overflow: "hidden" }, fillStyle]}>
              <LinearGradient colors={fam.c} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <Animated.View style={[styles.shimmerWrap, shimmer]} pointerEvents="none">
              <LinearGradient colors={["transparent", "rgba(182,71,158,0.35)", "transparent"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
            {/* big card */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.big, big]}>
              <View style={styles.bTop}>
                <Text style={styles.bK}>Margin account</Text>
                <Text style={styles.bK}>{CHAIN_LABEL[chain]}</Text>
              </View>
              <View>
                <Text style={styles.bAddr}>{addrText}</Text>
                <Text style={styles.bMeta}>{openDone ? "Opened just now" : sub >= 1 ? `Creating on ${CHAIN_LABEL[chain]}` : "Waiting to sign"}</Text>
              </View>
            </Animated.View>
            {/* docked strip */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.strip, strip]}>
              <View style={styles.sIc}>
                <Icon name="account_balance" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flexShrink: 0 }}>
                <Text style={styles.sK}>Margin account</Text>
                <Text style={styles.sA}>{addrText}</Text>
              </View>
              <View style={styles.sR}>
                <Text style={styles.sV} numberOfLines={1}>
                  {hasDep ? `${fmt(depN)} ${(depLabel ?? "").split(" ").slice(1).join(" ")}` : "Open"}
                </Text>
                {hasBor && (iBor <= cur) && (
                  <Text style={styles.sV2} numberOfLines={1}>
                    {fmt(borN)} {(borLabel ?? "").split(" ").slice(1).join(" ")} borrowed
                  </Text>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function FlowLine({ d, on, doneNow }: { d: string; on: boolean; doneNow: boolean }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(on || doneNow ? 1 : 0, { duration: 600, easing: EASE });
  }, [on, doneNow, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: (1 - p.value) * 200 }));
  return <AnimatedPath animatedProps={props} d={d} stroke={doneNow ? "#B6479E" : "#703AE6"} strokeWidth={2.4} strokeLinecap="round" fill="none" strokeDasharray={[200, 200]} />;
}

function ParticleGroup({ clock, x, t, run }: { clock: SharedValue<number>; x: number; t: number; run: boolean }) {
  return (
    <>
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Particle key={i} clock={clock} i={i} x={x} t={t} run={run} />
      ))}
    </>
  );
}

function Node({ x, icon, label, value, on, done }: { x: number; icon: "account_balance_wallet" | "account_balance"; label: string; value: string; on: boolean; done: boolean }) {
  const { colors } = useTheme();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withTiming(on || done ? 1 : 0.55, { duration: 400 });
  }, [on, done, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View style={[styles.node, { left: x - 44 }, st]}>
      <View style={[styles.nc, { backgroundColor: colors.bg, borderColor: on || done ? "#B6479E" : colors.border }]}>
        <Icon name={icon} size={20} color={on || done ? "#B6479E" : "muted"} />
        {done && (
          <View style={styles.nok}>
            <Icon name="check" size={11} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={[styles.nl, { color: colors.muted }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.nv, { color: colors.text }]} numberOfLines={1}>{value}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  legs: { borderRadius: 16, padding: 16 },
  arrow: { alignItems: "center", paddingVertical: 4 },
  legL: { fontFamily: font.regular, fontSize: 13 },
  legV: { fontFamily: font.semibold, fontSize: 22, lineHeight: 30, fontVariant: ["tabular-nums"] },
  legS: { fontFamily: font.regular, fontSize: 12, fontVariant: ["tabular-nums"] },
  first: { borderRadius: 16, padding: 14, gap: 10 },
  firstT: { fontFamily: font.semibold, fontSize: 15 },
  firstD: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  fstep: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  num: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  numT: { fontFamily: font.semibold, fontSize: 12 },
  stT: { fontFamily: font.semibold, fontSize: 14, flexShrink: 1 },
  stD: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  tagT: { fontFamily: font.semibold, fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  rowL: { fontFamily: font.regular, fontSize: 14 },
  rowV: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  note: { textAlign: "center", fontFamily: font.regular, fontSize: 12 },
  h: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28 },
  cap: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  hd: { flexDirection: "row", alignItems: "center", gap: 14 },
  ring: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  card: { borderRadius: 16, paddingHorizontal: 14 },
  trow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, paddingVertical: 6 },
  ck: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tile: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  sec: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase" },
  bar: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 8 },
  dt: { flexDirection: "row", alignItems: "center", gap: 6 },
  em: { width: 20, height: 1, marginRight: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  stepper: { flexDirection: "row", justifyContent: "center", gap: 18 },
  sp: { flexDirection: "row", alignItems: "center", gap: 6 },
  spc: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  acct: { position: "absolute", overflow: "hidden" },
  outline: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 20 },
  shimmerWrap: { ...StyleSheet.absoluteFill, width: 90 },
  big: { padding: 16, justifyContent: "space-between" },
  bTop: { flexDirection: "row", justifyContent: "space-between" },
  bK: { fontFamily: font.regular, fontSize: 12, color: "rgba(255,255,255,0.85)" },
  bAddr: { fontFamily: font.semibold, fontSize: 18, color: "#FFFFFF", letterSpacing: 0.4 },
  bMeta: { fontFamily: font.regular, fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
  strip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 },
  sIc: { width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  sK: { fontFamily: font.regular, fontSize: 11, color: "rgba(255,255,255,0.85)" },
  sA: { fontFamily: font.semibold, fontSize: 14, color: "#FFFFFF" },
  sR: { flex: 1, minWidth: 0, alignItems: "flex-end" },
  sV: { fontFamily: font.semibold, fontSize: 14, color: "#FFFFFF", fontVariant: ["tabular-nums"], maxWidth: "100%" },
  sV2: { fontFamily: font.regular, fontSize: 12, color: "rgba(255,255,255,0.9)", fontVariant: ["tabular-nums"], maxWidth: "100%" },
  node: { position: "absolute", top: 126, width: 88, alignItems: "center", gap: 2 },
  nc: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  nok: { position: "absolute", right: -4, bottom: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: "#703AE6", alignItems: "center", justifyContent: "center" },
  nl: { fontFamily: font.regular, fontSize: 11, marginTop: 4 },
  nv: { fontFamily: font.semibold, fontSize: 12, fontVariant: ["tabular-nums"] },
});

void withDelay;
void withSequence;
