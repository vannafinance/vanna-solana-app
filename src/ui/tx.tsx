import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ACTIVITY, type Activity } from "@/sample/data";
import { recordConfirmed, rememberActivity } from "@/state/activity-store";
import { tokFmt } from "@/format";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconAction } from "@/components/ui/kit";
import { MascotDone } from "@/mascot/mascot";
import { TailLoader } from "@/mascot/tail-loader";
import { ACCOUNT } from "@/sample/data";
import { type Chain, CHAIN_LABEL } from "@/state/chain";
import { refreshAccountSoon } from "@/chain/account-live";
import { onSigned } from "@/chain/sign";
import { personalReady } from "@/state/personal";
import { mutate } from "@/state/store";
import { inUseWallet } from "@/state/wallets";
import { authenticate, lockState } from "@/state/lock";
import { useTheme } from "@/theme/use-theme";
import { type Family, font } from "@/theme/tokens";

import { type MarginFlow, MarginFlowSheet } from "./first-time-flow";
import { pauseLiveWhile, setLivePaused } from "@/state/live-pause";

import { noteTxResult } from "@/state/notes";
import { guardSheet, openSheet, sheetOpen, toast } from "./overlay";
import { haptic } from "@/ui/haptics";
import { externalWalletName, isWalletTimeout, type TxSend, type TxStatus, useOnForeground, WALLET_TIMEOUT_TEXT, waitingLine } from "./wallet-wait";

/* The one transaction sheet every money action uses (design core.js TX): review → sign → progress (Sent, Processed, Confirmed) → done
   or fail. Signing here is the embedded-wallet stand-in (Android passkey / fingerprint, iOS Face ID); real signers (Dynamic embedded
   wallet, Mobile Wallet Adapter, WalletConnect) plug in at sign(). On sample data `apply` mutates the sample state. */
export type TxSpec = {
  chain: Chain;
  fam: Family;
  title: string;
  cta: string;
  legs: { l: string; v: string; s?: string }[];
  rows: [string, string, ("pos" | "neg" | "")?][];
  done: { title: string; line?: string; action?: [string, () => void] };
  apply: (hash?: string) => void;
  // When set, confirm signs and submits this before apply. Omit only for actions that are not on chain yet.
  send?: TxSend;
  // a custom review (design sheets that are their own review, e.g. Close all positions); replaces legs + rows
  body?: ReactNode;
  // Margin deposit / borrow on a real wallet: the steps (open the account when there is none, then the deposits and borrows), each its
  // own transaction. When set, the sheet uses the margin flow layout (ui/first-time-flow.tsx) and runs these steps instead of `send`.
  flow?: MarginFlow;
  // Called once every flow step has confirmed, with the last transaction hash (the sheet then records the history row).
  onAllDone?: (lastHash?: string) => void;
  // Called right after each flow step confirms (the real signature), so its history rows show at once, even if a later step fails.
  onStepDone?: (stepIndex: number, hash: string) => void;
  // Ways to finish what a failure left half done (e.g. a perps open whose USDC moved but whose order failed): offered on the failed
  // screen in place of "Try again", each sent as its own transaction in this sheet. Nothing to offer = undefined or [].
  recover?: (error: unknown) => TxRecover[] | undefined;
};
export type TxRecover = { label: string; send: TxSend; done: TxSpec["done"]; apply?: (hash?: string) => void };

const nowLabel = () => {
  const d = new Date();
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const FEE: Record<Chain, string> = { solana: "~0.000005 SOL" };

// The history row the action adds carries the chain's transaction hash, so its explorer link is real (shared by both layouts).
function recordDone(spec: TxSpec, h?: string) {
  mutate(() => {
    spec.apply(h);
    const row = h && ACTIVITY[spec.chain][0];
    if (h && row) {
      row.hash = h;
      row.chain = spec.chain;
      row.ms = Date.now();
      row.tx = `${h.slice(0, 4)}…${h.slice(-4)}`;
      const owner = inUseWallet(spec.chain)?.full;
      if (owner) void rememberActivity(spec.chain, owner, { ...row });
    }
  });
  refreshAccountSoon(spec.chain);
}

// The review's closing rows: the network fee and the paying account.
function feeRows(chain: Chain, each = ""): TxSpec["rows"] {
  const real = inUseWallet(chain);
  const w = real ? { app: real.app, addr: real.addr } : ACCOUNT.wallets[chain];
  return [["Fee", FEE[chain] + each], ["Account", w.app === "Vanna wallet" ? w.addr : `${w.app} ${w.addr}`]];
}

export function runTx(spec: TxSpec) {
  if (spec.flow) {
    // a new account's review lists the steps instead of health factor and leverage (design)
    const isNew = spec.flow.steps[0].key === "open";
    const rows = [...(isNew ? [] : spec.rows), ...feeRows(spec.chain, spec.flow.steps.length > 1 ? " each" : "")];
    const flow = spec.flow;
    const onStepDone = (i: number, h: string) => {
      const owner = inUseWallet(spec.chain)?.full;
      const step = flow.steps[i];
      if (!owner || !step) return;
      const base = { t: nowLabel(), ms: Date.now(), hash: h, chain: spec.chain, tx: `${h.slice(0, 4)}…${h.slice(-4)}`, area: "Margin" };
      const rows: Activity[] =
        step.key === "open"
          ? [{ ...base, action: "Account created", detail: "Margin account opened", amt: "", sym: "SOL" }]
          : step.assets.map((j) => {
              const a = flow.assets[j];
              return a.role === "dep"
                ? { ...base, action: "Deposit", detail: "Collateral into the margin account", amt: tokFmt(a.amt, a.sym), sym: a.sym }
                : { ...base, action: "Borrow", detail: `${a.sym} borrowed`, amt: tokFmt(a.amt, a.sym), sym: a.sym };
            });
      recordConfirmed(spec.chain, owner, rows);
    };
    const ft: TxSpec = { ...spec, rows, onStepDone, onAllDone: (h) => recordDone(spec, h) };
    openSheet({ title: spec.title, content: (close) => <MarginFlowSheet spec={ft} close={close} /> });
    return;
  }
  openSheet({ title: spec.title, content: (close) => <TxFlow spec={spec} close={close} /> });
}

type Phase = "review" | "sign" | "progress" | "done" | "fail";

// The final screen of a transaction, kept so it can be shown again after its sheet was closed while it ran.
type TxResult = { phase: "done" | "fail"; fail: string; hash: string | null; recover: TxRecover[]; done: TxSpec["done"]; timedOut: boolean };

// The sheet was closed (X) while the transaction ran; it carried on and has now finished. The result goes to Notifications, and is
// shown: a failure re-opens its sheet on the failed screen (with any recovery buttons) when no other sheet is open; otherwise a
// toast says what happened with "View", which re-opens it.
function announceHidden(spec: TxSpec, r: TxResult) {
  const ok = r.phase === "done";
  noteTxResult(spec.chain, spec.fam, ok, ok ? r.done.title : `${spec.title}: not finished`, ok ? r.done.line ?? "Confirmed on chain." : r.fail);
  const reopen = () => openSheet({ title: spec.title, content: (close) => <TxFlow spec={spec} close={close} initial={r} /> });
  if (!ok && !sheetOpen()) return reopen();
  toast(ok ? r.done.title : r.fail, ok ? "ok" : "err", { action: ["View", reopen], ms: ok ? 5000 : 10000 });
}

// With "confirm transactions" on (Account > Security), the phone's own prompt (fingerprint, face unlock, Face ID) opens
// as soon as the sign step shows; otherwise the step is the tap-to-confirm stand-in.
function SignWithBiometrics({ onConfirm }: { onConfirm: () => void }) {
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || !lockState().confirmTx) return;
    asked.current = true;
    onConfirm();
  }, [onConfirm]);
  return null;
}

// `initial`: shown again on its final screen (announceHidden) instead of starting at the review.
function TxFlow({ spec, close, initial }: { spec: TxSpec; close: () => void; initial?: TxResult }) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>(initial?.phase ?? "review");
  const [step, setStep] = useState(initial?.phase === "done" ? 3 : 0);
  const [fail, setFail] = useState(initial?.fail ?? "Nothing was sent.");
  const [hash, setHash] = useState<string | null>(initial?.hash ?? null);
  const [authFailed, setAuthFailed] = useState(false);
  // What the last failure offers to finish (spec.recover), and the done text of the recovery that ran.
  const [recover, setRecover] = useState<TxRecover[]>(initial?.recover ?? []);
  const [done, setDone] = useState(initial?.done ?? spec.done);
  const lastAlt = useRef<TxRecover | undefined>(undefined);
  // The phone's own prompt, which also offers its PIN or passcode.
  const walletApp = externalWalletName(spec.chain);
  const [timedOut, setTimedOut] = useState(initial?.timedOut ?? false);
  // Hiding the sheet (X) does not cancel the transaction: it carries on, and its result is announced (announceHidden).
  const alive = useRef(true);
  const phaseNow = useRef(phase);
  useEffect(() => {
    phaseNow.current = phase;
  }, [phase]);
  useEffect(
    () => () => {
      alive.current = false;
      if (phaseNow.current === "progress") toast("It carries on in the background. The result will show here and in Notifications.", "info", { ms: 4000 });
    },
    [],
  );
  // The whole run is guarded, not only the wait for the wallet: sending and confirming several parts can take a minute or more,
  // and a stray tap on the dimmed screen, a drag down or Back used to close the sheet then. Only the X hides it.
  useEffect(
    () => guardSheet(phase === "progress", step === 0 ? undefined : "Still sending. It finishes even if you close this with the X."),
    [phase, step],
  );
  // The live market sockets stand still from the tap until the transaction has finished (see live-pause.ts).
  useEffect(() => {
    setLivePaused(phase === "progress");
    return () => setLivePaused(false);
  }, [phase]);
  // Back from the wallet: re-read the chain so the screens behind the sheet show what really happened.
  const onForeground = useCallback(() => refreshAccountSoon(spec.chain), [spec.chain]);
  useOnForeground(phase === "progress" || phase === "fail", onForeground);
  const confirmIdentity = () => {
    setAuthFailed(false);
    authenticate("Confirm transaction")
      .then((ok) => (ok ? void approve() : setAuthFailed(true)))
      .catch(() => setAuthFailed(true));
  };

  // `alt`: a recovery from the failed screen, sent instead of spec.send (its own done text and apply).
  const approve = async (alt?: TxRecover) => {
    setPhase("progress");
    setStep(0);
    setTimedOut(false);
    setDone(alt?.done ?? spec.done);
    lastAlt.current = alt;
    const send = alt ? alt.send : spec.send;
    const apply = alt ? alt.apply ?? (() => {}) : spec.apply;
    const onStatus = (st: TxStatus) => setStep((s) => (st === "waiting_for_wallet" ? 0 : Math.max(s, st === "sending" ? 1 : 2)));
    // "Sent" only once the wallet has really signed.
    const stopSigned = onSigned(() => setStep((s) => Math.max(s, 1)));
    try {
      // A real wallet must never see a pretend success: actions without an on-chain path stop here.
      if (!send && personalReady(spec.chain)) throw new Error("This action is not connected to the chain yet. Nothing was sent.");
      let h: string | undefined;
      if (send) {
        // paused until the transaction settles, even if the sheet is hidden meanwhile
        h = (await pauseLiveWhile(send(onStatus))) || undefined;
        if (h) setHash(h);
        setStep(2);
      }
      setStep(3);
      mutate(() => {
        apply(h);
        // the history row the action just added carries the chain's own transaction hash, so its explorer link is real
        const row = h && ACTIVITY[spec.chain][0];
        if (h && row) {
          row.hash = h;
          row.chain = spec.chain;
          row.ms = Date.now();
          row.tx = `${h.slice(0, 4)}…${h.slice(-4)}`;
          const owner = inUseWallet(spec.chain)?.full;
          if (owner) void rememberActivity(spec.chain, owner, { ...row });
        }
      });
      // re-read the real account so every screen shows the chain's figures
      if (send) refreshAccountSoon(spec.chain);
      setPhase("done");
      haptic.success();
      if (!alive.current) announceHidden(spec, { phase: "done", fail: "", hash: h ?? null, recover: [], done: alt?.done ?? spec.done, timedOut: false });
    } catch (e) {
      const to = isWalletTimeout(e);
      const msg = to ? WALLET_TIMEOUT_TEXT : e instanceof Error ? e.message : "The transaction was not sent";
      const rec = (!to && spec.recover?.(e)) || [];
      setTimedOut(to);
      setRecover(rec);
      setFail(msg);
      setPhase("fail");
      haptic.error();
      // Something may have landed before the failure: re-read the chain so the screens show it.
      if (send) refreshAccountSoon(spec.chain);
      if (!alive.current) announceHidden(spec, { phase: "fail", fail: msg, hash: null, recover: rec, done: alt?.done ?? spec.done, timedOut: to });
    } finally {
      stopSigned();
    }
  };
  const finish = (action?: () => void) => {
    close();
    if (action) action();
    else toast(done.title);
  };

  if (phase === "review") {
    return (
      <View style={{ gap: 12, paddingBottom: 4 }}>
        {spec.body ?? (<>
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
        <View>
          {[...spec.rows, ...feeRows(spec.chain)].map(([l, v, t], i) => (
            <View key={l + i} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <Text style={[styles.rowL, { color: colors.muted }]}>{l}</Text>
              <Text style={[styles.rowV, { color: t === "pos" ? colors.positive : t === "neg" ? colors.negative : colors.text }]}>{v}</Text>
            </View>
          ))}
        </View>
        </>)}
        <Button label={spec.cta} fam={spec.fam} icon={lockState().confirmTx ? (Platform.OS === "ios" ? "face" : "fingerprint") : undefined} onPress={() => (lockState().confirmTx ? setPhase("sign") : void approve())} />
      </View>
    );
  }

  if (phase === "sign") {
    const ios = Platform.OS === "ios";
    return (
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
        <SignWithBiometrics onConfirm={confirmIdentity} />
        <Text style={[styles.h, { color: colors.text }]}>{ios ? "Face ID" : "Confirm it's you"}</Text>
        <Pressable onPress={confirmIdentity} accessibilityRole="button" accessibilityLabel={ios ? "Face ID, tap to confirm" : "Use your passkey"} style={[styles.bio, { backgroundColor: colors.purpleTint }]}>
          <Icon name={ios ? "face" : "fingerprint"} size={44} color="#703AE6" />
        </Pressable>
        <Text style={[styles.cap, { color: colors.muted }]}>{authFailed ? "That didn't work. Try again, or use your phone's PIN." : ios ? "Look at your phone" : "Touch the sensor"}</Text>
        {authFailed && <Button label={ios ? "Try again or use passcode" : "Try again or use PIN"} fam={spec.fam} size="md" onPress={confirmIdentity} style={{ alignSelf: "stretch", marginTop: 8 }} />}
        <Button label="Cancel" v="text" size="md" onPress={() => (haptic.error(), setPhase("fail"))} style={{ alignSelf: "stretch", marginTop: 8 }} />
      </View>
    );
  }

  if (phase === "fail") {
    return (
      <View style={{ gap: 16 }}>
        <View style={styles.hd}>
          <View style={[styles.ring, { backgroundColor: colors.pinkTint }]}>
            <Icon name="close" size={24} color={colors.onPinkTint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.h, { color: colors.text }]}>Not confirmed</Text>
            <Text style={[styles.cap, { color: colors.muted }]}>{fail}</Text>
          </View>
        </View>
        {recover.length ? (
          recover.map((r, i) => <Button key={r.label} label={r.label} fam={spec.fam} v={i === 0 ? undefined : "outline"} size={i === 0 ? undefined : "md"} onPress={() => void approve(r)} />)
        ) : (
          <Button label="Try again" fam={spec.fam} onPress={() => (timedOut ? void approve(lastAlt.current) : setPhase("review"))} />
        )}
        <Button label={timedOut ? "Close" : "Done"} v="text" size="md" onPress={() => close()} />
      </View>
    );
  }

  // progress / done (design txView): the tail loader or the done face, the title, the explorer link; then Sent, Processed, Confirmed
  return (
    <View style={{ gap: 20 }}>
      <View style={styles.hd}>
        {phase === "done" ? <MascotDone size={56} /> : <TailLoader size={48} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.h, { color: colors.text }]}>{phase === "done" ? done.title : step === 0 ? (walletApp ? "Waiting for your wallet" : "Sending") : `Sent to ${CHAIN_LABEL[spec.chain]}`}</Text>
          {phase === "done" && done.line && <Text style={[styles.cap, { color: colors.muted }]}>{done.line}</Text>}
          {phase === "progress" && step === 0 && !!walletApp && <Text style={[styles.cap, { color: colors.muted }]}>{waitingLine(walletApp)}</Text>}
        </View>
        {/* Only once the chain has the transaction and there is a link to open */}
        {phase === "done" && hash && (
          <IconAction icon="open_in_new" label="View on Solana Explorer" onPress={() => Linking.openURL(`https://explorer.solana.com/tx/${hash}?cluster=custom&customUrl=${encodeURIComponent("https://rpc-devnet.solana.vanna.finance")}`).catch(() => toast("Couldn't open the explorer"))} />
        )}
      </View>
      <Progress step={step} />
      {phase === "done" && (
        <View style={{ gap: 4 }}>
          <Button label="Done" fam={spec.fam} onPress={() => finish()} />
          {spec.done.action && <Button label={spec.done.action[0]} v="text" size="md" onPress={() => finish(spec.done.action![1])} />}
        </View>
      )}
    </View>
  );
}

function Progress({ step }: { step: number }) {
  const { colors } = useTheme();
  const w = useSharedValue(8);
  useEffect(() => {
    w.value = withTiming([8, 33, 66, 100][step], { duration: 500, easing: Easing.bezier(0.2, 0, 0, 1) });
  }, [step, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.bar, { backgroundColor: colors.divider }]}>
        <Animated.View style={[styles.fill, { backgroundColor: "#703AE6" }, st]} />
      </View>
      <View style={styles.steps}>
        {["Sent", "Processed", "Confirmed"].map((l, i) => (
          <View key={l} style={styles.step}>
            {i > 0 && <View style={[styles.em, { backgroundColor: colors.border }]} />}
            <View style={[styles.dot, { backgroundColor: step > i ? "#703AE6" : colors.border }]} />
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: step > i ? colors.text : colors.muted }}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legs: { borderRadius: 16, padding: 16 },
  arrow: { alignItems: "center", paddingVertical: 4 },
  legL: { fontFamily: font.regular, fontSize: 13 },
  legV: { fontFamily: font.semibold, fontSize: 22, lineHeight: 30, fontVariant: ["tabular-nums"] },
  legS: { fontFamily: font.regular, fontSize: 12, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  rowL: { fontFamily: font.regular, fontSize: 14 },
  rowV: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  h: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28 },
  cap: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  bio: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginVertical: 16 },
  hd: { flexDirection: "row", alignItems: "center", gap: 14 },
  ring: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  bar: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  steps: { flexDirection: "row", justifyContent: "center", gap: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: 6 },
  em: { width: 20, height: 1, marginRight: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
