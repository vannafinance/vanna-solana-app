import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  type SharedValue,
  cancelAnimation,
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconAction } from "@/components/ui/kit";
import { MascotDone, MascotRest } from "@/mascot/mascot";
import { TailLoader } from "@/mascot/tail-loader";
import { refreshAccountSoon } from "@/chain/account-live";
import { onSigned } from "@/chain/sign";
import { tokFmt } from "@/format";
import { type Chain, CHAIN_LABEL } from "@/state/chain";
import { authenticate, lockState } from "@/state/lock";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";

import { pauseLiveWhile, setLivePaused } from "@/state/live-pause";

import { noteTxResult } from "@/state/notes";
import { LegBar, LegList, QuietButton, StopConfirm } from "./leg-rows";
import { cancelledLine, initLegs, isCancelled, type Leg, type LegPhase, type LegSend, type LegsState, names, shortReason, wasWere } from "./legs";
import { guardSheet, interceptClose, SheetFooter, toast } from "./overlay";
import type { TxSpec } from "./tx";
import { externalWalletName, isWalletTimeout, type TxSend, type TxStatus, useOnForeground, WALLET_TIMEOUT_TEXT, waitingLine } from "./wallet-wait";

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
  // gets a status callback (waiting_for_wallet | sending | confirming) when the chain side reports one
  send: TxSend;
  // The same send with the sheet's controls (ui/legs.ts LegRun: onStatus, onLeg, the cancel signal); used instead of `send` when set,
  // so Cancel (and the X while the wallet waits) can end the wallet request when the spec is `cancelable`.
  run?: LegSend;
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

// what the account holds once the assets marked `landed` (one flag per MarginFlow.assets) are in it
function holdingsOf(f: MarginFlow, landed: boolean[]): Holdings {
  const h: Holdings = { col: { ...f.base.col }, debt: { ...f.base.debt } };
  f.assets.forEach((a, j) => {
    if (!landed[j]) return;
    const side = a.role === "dep" ? h.col : h.debt;
    side[a.sym] = (side[a.sym] ?? 0) + a.amt;
  });
  return h;
}
// One transaction can confirm the account, every deposit and every borrow at once; the stage then plays them in order, one step
// this long each, after the confirmation (never before it, never on a failure, not at all with Reduce motion).
const LAND_STEP_MS = 650;
// one asset reads as its amount, several fold to a count ("3 assets")
const lineOf = (side: Record<string, number>, suffix: string, empty: string) => {
  const k = Object.keys(side);
  return k.length === 0 ? empty : k.length === 1 ? `${tokFmt(side[k[0]], k[0])}${suffix}` : `${k.length} assets${suffix}`;
};

type Phase = "review" | "run" | "done" | "fail";

// The steps as leg rows (design MULTI-LEG.md v3: the compact rows under the stage), each placed from what the sheet really saw.
function stepLegs(
  steps: TxStep[],
  o: { phase: Phase; cur: number; sub: number; bad: boolean; done: boolean[]; hashes: string[]; failIdx: number; failMsg: string; halted: boolean; walletApp: string | null },
): LegsState {
  const s = initLegs(steps.map((x, i) => ({ id: String(i), label: x.title, noun: x.title, stage: i })));
  const phaseOf = (i: number): LegPhase => {
    if (o.done[i]) return "done";
    if (o.phase === "fail") return i === o.failIdx && !o.halted ? "failed" : "skipped";
    if (i > o.cur) return o.cur > 0 || o.sub > 0 ? "queued" : "wait";
    if (i < o.cur) return "done";
    if (o.bad) return "failed";
    return o.sub === 0 ? (o.walletApp ? "wait" : "check") : o.sub === 1 ? "send" : o.sub === 2 ? "confirm" : "done";
  };
  const legs: Leg[] = s.legs.map((l, i) => {
    const phase = phaseOf(i);
    return { ...l, phase, signature: o.hashes[i] || undefined, reason: phase === "failed" && o.failMsg ? shortReason(o.failMsg) : undefined };
  });
  return { ...s, legs, asking: o.phase === "run" && o.sub === 0 && !o.bad && !!o.walletApp, signed: o.sub > 0 || o.cur > 0, heard: true };
}

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
  // While a confirmed step's assets are played in (LAND_STEP_MS): how many of them have landed so far; null = none being played.
  const [land, setLand] = useState<number | null>(null);
  const [failIdx, setFailIdx] = useState(0);
  const [failMsg, setFailMsg] = useState("");
  const [timedOut, setTimedOut] = useState(false); // the wallet never answered: nothing was sent
  // How a halted run ended: the person cancelled the wallet request, or stopped before the next step was asked for.
  const [halt, setHalt] = useState<null | "cancelled" | "stopped">(null);
  const [stopAsk, setStopAsk] = useState(false);
  const [stopping, setStopping] = useState(false);
  const stopRef = useRef(false);
  const cancelCtl = useRef<AbortController | null>(null);
  const walletApp = externalWalletName(spec.chain);
  const alive = useRef(true);
  useEffect(() => () => void (alive.current = false), []);
  // A stray tap outside, a drag down or Back must not dismiss the sheet while the steps run (the X still can).
  useEffect(() => guardSheet(phase === "run", sub === 0 ? undefined : "Still sending. It finishes even if you close this with the X."), [phase, sub]);
  useEffect(() => {
    setLivePaused(phase === "run");
    return () => setLivePaused(false);
  }, [phase]);
  useEffect(() => {
    if (!isNew) f.accountAddr().then(setAddr).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const runFrom = useCallback(
    async (from: number) => {
      setPhase("run");
      setBad(false);
      setTimedOut(false);
      setFailMsg("");
      setHalt(null);
      setStopAsk(false);
      setStopping(false);
      setLand(null);
      stopRef.current = false;
      const hs = [...hashes];
      // the played-in steps run only while the sheet is on screen; hidden, the result is announced without waiting
      const pace = (ms: number) => sleep(rm || !alive.current ? 0 : ms);
      for (let i = from; i < steps.length; i++) {
        if (!alive.current) {
          toast("Stopped. The steps already approved are on chain; open it again to finish.", "info");
          return;
        }
        // Stop: the next step is never asked for; what landed stays
        if (stopRef.current && i > from) {
          setFailIdx(i);
          setHalt("stopped");
          if (hs.some(Boolean)) refreshAccountSoon(spec.chain);
          setPhase("fail");
          return;
        }
        setCur(i);
        setSub(0);
        const stop = onSigned(() => setSub((s) => Math.max(s, 1)));
        // Until the chain side says otherwise, no hash and no signature yet means the wallet has not answered: "waiting for your wallet".
        const onStatus = (st: TxStatus) => {
          if (!alive.current) return;
          if (st === "waiting_for_wallet") setSub(0);
          else setSub((s) => Math.max(s, st === "sending" ? 1 : 2));
        };
        const cc = (cancelCtl.current = new AbortController());
        const run = steps[i].run;
        try {
          const h = (await pauseLiveWhile(run ? run({ onStatus, onLeg: () => {}, cancel: cc.signal, stop: new AbortController().signal }) : steps[i].send(onStatus))) || "";
          hs[i] = h;
          setHashes([...hs]);
          if (h && i < steps.length - 1) spec.onStepDone?.(i, h);
          setSub(2);
          await sleep(rm ? 0 : 450);
          const opens = steps[i].key === "open";
          if (opens) setAddr((await f.accountAddr().catch(() => null)) ?? null);
          // Several things confirmed by this one transaction: the account card fills first, then it docks, then each asset lands in
          // turn (deposits, then borrows, in the flow's order) before the sheet finishes.
          const n = steps[i].assets.length;
          const play = !rm && alive.current && (opens ? n > 0 : n > 1);
          if (play) setLand(0);
          setSub(3);
          setDone((d) => d.map((x, j) => x || j === i));
          haptic.success();
          if (play) {
            if (opens) {
              await pace(LAND_STEP_MS);
              setDocked(true);
            }
            for (let q = 1; q <= n; q++) {
              await pace(LAND_STEP_MS);
              setLand(q);
            }
            await pace(LAND_STEP_MS);
            setLand(null);
          }
          const last = i === steps.length - 1;
          await sleep(rm || play ? 0 : last ? 600 : 900);
          if (!last && steps[i].key === "open") {
            setDocked(true);
            await sleep(rm ? 0 : 650);
          }
        } catch (e) {
          stop();
          if (!alive.current) {
            const msg = e instanceof Error ? e.message : "The transaction was not sent";
            noteTxResult(spec.chain, spec.fam, false, `${spec.title}: not finished`, `${msg} Steps already confirmed stay on chain; open it again to finish.`);
            toast(msg, "err", { ms: 8000 });
            if (hs.some(Boolean)) refreshAccountSoon(spec.chain);
            return;
          }
          setFailIdx(i);
          if (isCancelled(e) || cc.signal.aborted) {
            // cancelled before the wallet answered: nothing of this step was sent
            setHalt("cancelled");
            setFailMsg(cancelledLine(walletApp));
            if (hs.some(Boolean)) refreshAccountSoon(spec.chain);
            setPhase("fail");
            return;
          }
          const timedOut = isWalletTimeout(e);
          setTimedOut(timedOut);
          setFailMsg(timedOut ? WALLET_TIMEOUT_TEXT : e instanceof Error ? e.message : "The transaction was not sent");
          setBad(true);
          haptic.error();
          // earlier steps are on chain: re-read the account so the screen (and the next attempt) sees them
          if (hs.some(Boolean)) refreshAccountSoon(spec.chain);
          if (!timedOut) await sleep(rm ? 0 : 1000);
          setPhase("fail");
          return;
        }
        stop();
      }
      await sleep(rm ? 0 : 900);
      spec.onAllDone?.(hs.filter(Boolean).pop());
      if (!alive.current) {
        noteTxResult(spec.chain, spec.fam, true, spec.done.title, spec.done.line ?? "Confirmed on chain.");
        return void toast(spec.done.title, "ok", { ms: 5000 });
      }
      setPhase("done");
    },
    [steps, hashes, f, spec, rm, walletApp],
  );
  // Back from the wallet: re-read the chain so the sheet and the screens behind it show what really happened.
  const onForeground = useCallback(() => {
    if (!alive.current) return;
    refreshAccountSoon(spec.chain);
    if (!isNew || done[0]) f.accountAddr().then((a) => alive.current && a && setAddr(a)).catch(() => {});
  }, [spec.chain, f, isNew, done]);
  useOnForeground(phase === "run" || phase === "fail", onForeground);
  // With "confirm transactions" on (Account > Security), the phone's own prompt runs before the first signature, as in tx.tsx.
  const start = () => {
    if (!lockState().confirmTx) return void runFrom(0);
    authenticate("Confirm transaction")
      .then((ok) => (ok ? void runFrom(0) : toast("Not confirmed")))
      .catch(() => toast("Not confirmed"));
  };

  // Cancel before the wallet answered (a step whose `run` ends the wallet request); the X acts as Cancel then.
  const canCancel = phase === "run" && !bad && sub === 0 && !!walletApp && !!spec.cancelable && !!steps[cur]?.run;
  const cancel = useCallback(() => {
    const c = cancelCtl.current;
    if (!c || c.signal.aborted) return;
    haptic.tap();
    c.abort();
  }, []);
  useEffect(() => {
    interceptClose(canCancel ? () => (cancel(), true) : null);
    return () => interceptClose(null);
  }, [canCancel, cancel]);
  // Stop: only while a later step is still held back (each step is its own approval, asked for only after the previous one landed).
  // On the last step there is nothing left to hold back, so there is no Stop.
  const canStop = phase === "run" && steps.length > 1 && !bad && sub >= 1 && cur < steps.length - 1 && !stopping;
  const stopHere = () => {
    setStopAsk(false);
    stopRef.current = true;
    setStopping(true);
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

  const last = cur === steps.length - 1;
  const finalFace = sub === 3 && last && land === null;
  const waiting = !bad && sub === 0 && !!walletApp;

  /* ------------------------------------------------------------- several steps: stage, header, bar and one row per step (v3) */
  if (steps.length > 1) {
    const ls = stepLegs(steps, { phase, cur, sub, bad, done, hashes, failIdx, failMsg, halted: !!halt, walletApp });
    const ok = ls.legs.filter((l) => l.phase === "done");
    const left = ls.legs.filter((l) => l.phase !== "done");
    const failed = phase === "fail" && !halt;
    let title: string;
    let caption: string;
    if (phase === "done") [title, caption] = [spec.done.title, spec.done.line ?? ""];
    else if (halt === "cancelled" && !ok.length) [title, caption] = ["Cancelled", cancelledLine(walletApp)];
    else if (halt)
      [title, caption] =
        isNew && ok.length === 1
          ? ["Account opened, nothing deposited yet", "Your margin account is open. The deposits and the borrow were not sent."]
          : [`Stopped: ${ok.length} of ${steps.length} done`, `${names(left)} ${wasWere(left)} not sent.`];
    else if (failed) {
      const s = steps[failIdx];
      const why = timedOut
        ? ""
        : isNew && failIdx === 0
          ? `${s.title} didn't go through and nothing was created.`
          : `${s.title} didn't go through and nothing was sent for it. ${isNew ? "Your margin account is open and safe." : "Earlier steps are confirmed."}`;
      [title, caption] = ["Not confirmed", `${why} ${timedOut ? failMsg : ""}`.trim()];
    } else {
      title = bad ? "Not confirmed" : waiting ? "Waiting for your wallet" : sub === 0 ? "Sending" : sub === 3 ? "Confirmed" : `Sent to ${CHAIN_LABEL[spec.chain]}`;
      caption = stopping ? "Stopping. Steps already sent will still finish." : waiting ? waitingLine(walletApp!) : steps[cur].doing;
    }
    const later = steps.length - 1 - cur;
    let buttons: ReactNode = null;
    if (phase === "run") {
      buttons =
        stopAsk && canStop ? (
          <StopConfirm body={`Steps already sent will finish. The remaining ${later} will not be sent.`} fam={spec.fam} onStop={stopHere} onKeep={() => setStopAsk(false)} />
        ) : canStop ? (
          <QuietButton label="Stop" onPress={() => setStopAsk(true)} />
        ) : null;
    } else if (phase === "done") buttons = <Button label="Done" fam={spec.fam} onPress={() => close()} />;
    else
      buttons = (
        <View style={{ gap: 4 }}>
          <Button
            label={halt === "cancelled" && !ok.length ? "Try again" : halt ? "Continue" : timedOut ? "Try again" : `Retry failed (${left.length})`}
            fam={spec.fam}
            onPress={() => void runFrom(failIdx)}
          />
          <Button label={halt && ok.length ? "Done" : "Close"} v="text" size="md" onPress={() => close()} />
        </View>
      );
    const finished = phase === "done" || phase === "fail";
    return (
      <View style={{ gap: 20 }}>
        <Stage chain={spec.chain} flow={f} lite={lite} cur={phase === "done" ? steps.length - 1 : cur} sub={phase === "done" ? 3 : sub} bad={failed || bad} docked={docked} addr={addr} done={done} land={land} />
        <View style={styles.hd}>
          {phase === "done" || (!finished && finalFace) ? (
            <MascotDone size={56} />
          ) : halt ? (
            <MascotRest size={56} mood="calm" />
          ) : failed || bad ? (
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
            {!!caption && <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={3}>{caption}</Text>}
          </View>
        </View>
        {canCancel && <QuietButton label="Cancel" onPress={cancel} />}
        <LegBar s={ls} />
        <LegList s={ls} multi onRetry={failed ? () => void runFrom(failIdx) : undefined} />
        <SheetFooter>{buttons}</SheetFooter>
      </View>
    );
  }

  /* ------------------------------------------------------------- one transaction: failure */
  if (phase === "fail") {
    const calm = halt === "cancelled";
    return (
      <View style={{ gap: 16 }}>
        <View style={styles.hd}>
          {calm ? (
            <MascotRest size={52} mood="calm" />
          ) : (
            <View style={[styles.ring, { backgroundColor: colors.pinkTint }]}>
              <Icon name="close" size={24} color={colors.onPinkTint} />
            </View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.h, { color: colors.text }]}>{calm ? "Cancelled" : "Not confirmed"}</Text>
            <Text style={[styles.cap, { color: colors.muted }]}>{failMsg}</Text>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Button label="Try again" fam={spec.fam} onPress={() => (timedOut || calm ? void runFrom(failIdx) : (setBad(false), setSub(0), setPhase("review")))} />
          <Button label={calm || timedOut ? "Close" : "Done"} v="text" size="md" onPress={() => close()} />
        </View>
      </View>
    );
  }

  /* ------------------------------------------------------------- one transaction: done (face, title, line, explorer action; the bar; Done) */
  if (phase === "done") {
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

  /* ------------------------------------------------------------- one transaction: progress */
  const title = bad ? "Not confirmed" : waiting ? "Waiting for your wallet" : sub === 0 ? "Sending" : sub === 3 ? "Confirmed" : `Sent to ${CHAIN_LABEL[spec.chain]}`;
  const caption = waiting ? waitingLine(walletApp!) : steps[cur].doing;
  return (
    <View style={{ gap: 20 }}>
      <Stage chain={spec.chain} flow={f} lite={lite} cur={cur} sub={sub} bad={bad} docked={docked} addr={addr} done={done} land={land} />
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
          <Text style={[styles.cap, { color: colors.muted }]} numberOfLines={3}>{caption}</Text>
        </View>
      </View>
      {canCancel && <QuietButton label="Cancel" onPress={cancel} />}
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
  chain, flow, lite, cur, sub, bad, docked, addr, done, land,
}: {
  chain: Chain; flow: MarginFlow; lite: boolean; cur: number; sub: number; bad: boolean; docked: boolean; addr: string | null; done: boolean[]; land: number | null;
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
  // an asset is in the account once its step confirmed and, while that step is played in (`land`), its turn has come
  const landed = assets.map((_, j) => {
    const s = stepOf[j];
    return s >= 0 && done[s] && (land === null || s !== cur || steps[s].assets.indexOf(j) < land);
  });

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
  // (only into the docked strip: while a new account's card is still forming there is nothing for them to land in yet)
  const flowing = !bad && docked && (sub === 1 || sub === 2) && steps[cur].assets.length > 0;
  const many = steps[cur].assets.length > 1;
  const loop = 7 * 170 + 860 + 300 + assets.length * 110;
  useEffect(() => {
    recv.value = withTiming(flowing ? 1 : 0, { duration: 300 });
    if (flowing && !rm) {
      clock.value = 0;
      clock.value = withRepeat(withTiming(loop, { duration: loop, easing: Easing.linear }), -1);
    } else cancelAnimation(clock);
  }, [flowing, cur, rm]); // eslint-disable-line react-hooks/exhaustive-deps

  // strip lines: a single landing asset counts up when it lands, then the line settles (several fold to "3 assets")
  const landKey = landed.map(Number).join("");
  const seen = useRef(landed);
  const [held, setHeld] = useState(() => holdingsOf(flow, landed));
  // a single landing asset counts up on the UI thread (CountText); `tick` only says which line is counting
  const [tick, setTick] = useState<{ col?: [string, number, number]; debt?: [string, number, number] }>({});
  const flash = useSharedValue(0);
  useEffect(() => {
    const was = seen.current;
    const moved = assets.filter((_, j) => landed[j] && !was[j]);
    if (!moved.length) return;
    const before = holdingsOf(flow, was), after = holdingsOf(flow, landed);
    seen.current = landed;
    setHeld(after);
    flash.value = rm ? 0 : withSequence(withTiming(1, { duration: 1 }), withTiming(1, { duration: 650 }), withTiming(0, { duration: 1 }));
    if (!rm) {
      (["col", "debt"] as const).forEach((side) => {
        const a = moved.filter((x) => (x.role === "dep") === (side === "col"));
        if (!a.length) return;
        // a second asset on the same side folds the line to a count at once, even if the first is still counting up
        if (a.length !== 1 || Object.keys(after[side]).length !== 1) return setTick((tk) => ({ ...tk, [side]: undefined }));
        const sym = a[0].sym, from = before[side][sym] ?? 0, to = after[side][sym];
        setTick((tk) => ({ ...tk, [side]: [sym, from, to] }));
      });
    }
  }, [landKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const endTick = useCallback((side: "col" | "debt") => setTick((tk) => ({ ...tk, [side]: undefined })), []);
  const flashTop = useAnimatedStyle(() => ({ color: flash.value > 0.5 ? "#BFF6FA" : "#FFFFFF" }));
  const flashSub = useAnimatedStyle(() => ({ color: flash.value > 0.5 ? "#BFF6FA" : "rgba(255,255,255,0.82)" }));
  const colText = lineOf(held.col, "", isNew && !assets.some((a) => a.role === "dep") ? "Open" : "No collateral yet");

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
    if (landed[j]) return "done";
    if (s === cur && bad) return "bad";
    // confirmed but not landed yet (its turn in the played-in sequence has not come): it stays lit until it lands
    return docked && (running(s) || done[s]) ? "on" : "idle";
  };
  const addrText = addr ? short(addr) : "…";
  const debtText = lineOf(held.debt, " borrowed", "");
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
                {tick.col ? (
                  <CountText style={[styles.sV, flashTop]} sym={tick.col[0]} from={tick.col[1]} to={tick.col[2]} suffix="" onEnd={() => endTick("col")} />
                ) : (
                  <Animated.Text style={[styles.sV, flashTop]} numberOfLines={1}>{colText}</Animated.Text>
                )}
                {tick.debt ? (
                  <CountText style={[styles.sV2, flashSub]} sym={tick.debt[0]} from={tick.debt[1]} to={tick.debt[2]} suffix=" borrowed" onEnd={() => endTick("debt")} />
                ) : (
                  !!debtText && <Animated.Text style={[styles.sV2, flashSub]} numberOfLines={1}>{debtText}</Animated.Text>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        </>
      )}
    </View>
  );
}

// "1,234.50 SOL": the same figures as tokFmt, written so it can run as a worklet on the UI thread
const fmtTok = (n: number, sym: string) => {
  "worklet";
  const d = Math.abs(n) >= 0.01 ? 2 : 4;
  const [i, f] = Math.abs(n).toFixed(d).split(".");
  return `${n < 0 ? "−" : ""}${i.replace(/B(?=(d{3})+(?!d))/g, ",")}.${f} ${sym}`;
};

// a count-up that runs entirely on the UI thread (a TextInput whose text is an animated prop), 900 ms ease-out cubic as in the design
const AnimatedInput = Animated.createAnimatedComponent(TextInput);
function CountText({ sym, from, to, suffix, style, onEnd }: { sym: string; from: number; to: number; suffix: string; style: object; onEnd: () => void }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = 0;
    p.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }, (fin) => {
      if (fin) runOnJS(onEnd)();
    });
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const props = useAnimatedProps(() => {
    const t = fmtTok(from + (to - from) * p.value, sym) + suffix;
    return { text: t, defaultValue: t } as object;
  });
  return <AnimatedInput editable={false} pointerEvents="none" animatedProps={props} defaultValue={fmtTok(from, sym) + suffix} style={[style, styles.count]} />;
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
  count: { padding: 0, margin: 0, textAlign: "right", includeFontPadding: false },
  node: { position: "absolute", alignItems: "center" },
  halo: { position: "absolute", left: -5, top: -5, right: -5, bottom: -5 },
  nc: { borderWidth: 1, alignItems: "center", justifyContent: "center" },
  nok: { position: "absolute", right: -3, bottom: -3, width: 18, height: 18, borderRadius: 9, borderWidth: 2, backgroundColor: "#703AE6", alignItems: "center", justifyContent: "center" },
  nl: { fontFamily: font.semibold, fontSize: 12, lineHeight: 16 },
  nv: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
});
