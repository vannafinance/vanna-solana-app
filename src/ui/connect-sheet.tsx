import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { AppState, BackHandler, Linking, Pressable, ScrollView, type StyleProp, StyleSheet, Text, useWindowDimensions, View, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { connectSolanaWallet, type DetectedWallet, type ExternalConnection } from "@/chain/external";
import { launchApp, nativeAvailable } from "@/chain/native";
import { detectWallets, lastWalletPackage, rememberWalletPackage } from "@/chain/wallet-detect";
import { VannaMark } from "@/components/brand";
import { RiseIn } from "@/components/intro/rise-in";
import { Icon } from "@/components/ui/icon";
import { WalletLogo } from "@/components/wallet-logo";
import { LOGO_PNG, LOGO_SVG } from "@/generated/logos";
import { addExternalWallet, MAX_WALLETS, removeWallet, setWalletInUse, updateWalletSession, walletState, type WalletEntry } from "@/state/wallets";
import { useTheme } from "@/theme/use-theme";
import { BRAND_GRADIENT, font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";
import { guardSheet, openSheet, toast } from "@/ui/overlay";

/* Connect a wallet (design/wallet-picker, NOTES.md): one sheet open across the whole connection. Android lists the wallet apps on
   the phone (their own names and icons), the person taps theirs and it opens directly; one found connects at once; none found says
   how to get one and looks again each time the person comes back. While the wallet is in front the sheet waits behind it, and any
   answer brings the person back to the result: the Connected link animation, or a failed state with Try again. From Account, wallet
   apps already connected are hidden, and with 2 wallets kept the sheet first asks which one the new wallet replaces (removed only
   after the new one connects). The connection itself cannot be withdrawn: Cancel, a replaced request and the 90 s guard only make
   the sheet ignore a late answer. */

type Fail = "declined" | "timeout" | "error";
type Done = { name: string; icon: string | null; logo: string; addr: string };
type Step =
  | { v: "detect" }
  | { v: "list" }
  | { v: "none" }
  | { v: "all" }
  | { v: "replace" }
  // w null: opened through Android's own chooser, so the wallet is not known until it answers
  | { v: "opening" | "waiting"; w: DetectedWallet | null; single: boolean }
  | { v: "fail"; w: DetectedWallet | null; single: boolean; fail: Fail }
  | ({ v: "done" } & Done);
type Out = { entry: WalletEntry | null; toast: string };

const C = "solana" as const;
// A connection that never answers ends in "X didn't answer" after this, so the sheet is never stuck.
const CONNECT_MS = 90_000;
// The Connected animation is about 1.2 s; then a short hold on the final frame before the sheet closes.
const DONE_MS = 1600;
// Solana Mobile's page of wallets that work with Mobile Wallet Adapter (their wallets directory, solanamobile.com/wallets, answered 404 on 2026-11-20).
const LIST_URL = "https://docs.solanamobile.com/mobile-wallet-adapter/mobile-apps";
const EASE = Easing.bezier(0.2, 0, 0, 1);
const SPRING_EASE = Easing.bezier(0.34, 1.56, 0.64, 1);
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const shipped = (logo: string) => logo !== "VANNA" && (logo in LOGO_PNG || logo in LOGO_SVG);

/** Opens the Connect a wallet sheet and runs the whole connection. Resolves with the new wallet (now the one in use), or null. */
export function openConnectSheet(opts: { replacingId?: string } = {}): Promise<WalletEntry | null> {
  return new Promise((resolve) => {
    let ended = false;
    const out: Out = { entry: null, toast: "" };
    // Once: the sheet closed (X, Cancel, a tap outside, Back, or after Connected), or another sheet replaced it.
    const finish = () => {
      if (ended) return;
      ended = true;
      if (out.entry && out.toast) toast(out.toast);
      resolve(out.entry);
    };
    openSheet({ onClose: finish, content: (close) => <ConnectSheet opts={opts} close={close} out={out} onGone={finish} /> });
  });
}

// What a failed connection means, from external.ts's own wording ("declined", "did not answer", "took too long").
function failOf(e: unknown): Fail | "cancelled" {
  const m = e instanceof Error ? e.message : String(e ?? "");
  if (/cancell?ed by user/i.test(m)) return "cancelled";
  if (/declin/i.test(m)) return "declined";
  if (/did not answer|didn't answer|took too long/i.test(m)) return "timeout";
  return "error";
}

function ConnectSheet({ opts, close, out, onGone }: { opts: { replacingId?: string }; close: () => void; out: Out; onGone: () => void }) {
  const { colors } = useTheme();
  const rm = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // intro: nothing connected yet (the first connect); account: Add wallet
  const [intro] = useState(() => walletState().wallets[C].length === 0);
  const [step, setStep] = useState<Step>(() =>
    !intro && !opts.replacingId && walletState().wallets[C].length >= MAX_WALLETS ? { v: "replace" } : { v: "detect" },
  );
  const [found, setFound] = useState<DetectedWallet[]>([]);
  const [last, setLast] = useState<string | null>(null);
  const [skel, setSkel] = useState(false);

  const alive = useRef(true);
  const stepRef = useRef(step);
  stepRef.current = step;
  const replacing = useRef<string | undefined>(opts.replacingId);
  // Every connection request gets a number; an answer whose number is no longer current (Cancel, a new request, the guard) is ignored.
  const req = useRef(0);
  // The running connection can be ended (Cancel, another wallet, the guard): its wallet session is closed so the next request can start.
  const ctl = useRef<AbortController | null>(null);
  const active = useRef<{ w: DetectedWallet | null; single: boolean; at: number }>({ w: null, single: false, at: 0 });
  const detectSeq = useRef(0);
  const timers = useRef<{ guard?: ReturnType<typeof setTimeout>; open?: ReturnType<typeof setTimeout>; done?: ReturnType<typeof setTimeout> }>({});
  const pendingDone = useRef<Done | null>(null);

  const settle = () => {
    clearTimeout(timers.current.guard);
    clearTimeout(timers.current.open);
  };

  // One wallet app = one connected wallet: from Account, apps that stay connected are not listed (the replaced one's app is).
  const staysConnected = (pkg: string) => !intro && walletState().wallets[C].some((x) => x.pkg === pkg && x.id !== replacing.current);
  // the wallet used before first (first connect only), then A to Z as Android named them
  const visible = (all: DetectedWallet[], lead: string | null) =>
    all.filter((w) => !staysConnected(w.pkg)).sort((a, b) => (a.pkg === lead ? -1 : b.pkg === lead ? 1 : a.label.localeCompare(b.label)));

  async function detect() {
    // A build without Vanna's native module (Expo Go) can't list the wallet apps: Android's own chooser opens instead.
    if (!nativeAvailable) return connect(null, true);
    const seq = ++detectSeq.current;
    setStep({ v: "detect" });
    setSkel(false);
    // The skeleton shows only when finding the wallets takes longer than about 150 ms, then stays at least 400 ms so it never flashes.
    let skelAt = 0;
    const t = setTimeout(() => {
      if (detectSeq.current !== seq) return;
      skelAt = Date.now();
      setSkel(true);
    }, 150);
    const [all, lead] = await Promise.all([detectWallets(), intro ? lastWalletPackage() : Promise.resolve(null)]);
    clearTimeout(t);
    if (skelAt) await sleep(Math.max(0, skelAt + 400 - Date.now()));
    if (!alive.current || detectSeq.current !== seq) return;
    setFound(all);
    setLast(lead);
    const list = visible(all, lead);
    if (!list.length && all.length) setStep({ v: "all" });
    else if (!all.length) setStep({ v: "none" });
    else if (list.length === 1) connect(list[0], true);
    else setStep({ v: "list" });
  }

  function connect(w: DetectedWallet | null, single: boolean) {
    const id = ++req.current;
    detectSeq.current++;
    ctl.current?.abort();
    const abort = (ctl.current = new AbortController());
    settle();
    clearTimeout(timers.current.done);
    pendingDone.current = null;
    active.current = { w, single, at: Date.now() };
    // "Opening X…" for the moment Android takes to bring the wallet up; after Android's chooser it is "Waiting for your wallet" at once.
    setStep({ v: w ? "opening" : "waiting", w, single });
    if (w) {
      // Android switching to the wallet moves it on (AppState below); this covers a wallet that never comes up.
      timers.current.open = setTimeout(() => {
        const s = stepRef.current;
        if (req.current === id && s.v === "opening") setStep({ v: "waiting", w: s.w, single: s.single });
      }, 2500);
    }
    timers.current.guard = setTimeout(() => noAnswer(id), CONNECT_MS);
    connectSolanaWallet(w ?? undefined, abort.signal).then(
      (r) => {
        if (!alive.current || req.current !== id) return;
        settle();
        connected(w, r);
      },
      (e) => {
        if (!alive.current || req.current !== id) return;
        settle();
        failed(e);
      },
    );
  }

  function noAnswer(id: number) {
    if (!alive.current || req.current !== id) return;
    req.current++; // a late answer is ignored: the wallet is never added from it
    ctl.current?.abort();
    settle();
    haptic.error();
    setStep({ v: "fail", w: active.current.w, single: active.current.single, fail: "timeout" });
  }

  function failed(e: unknown) {
    const { w, single } = active.current;
    const kind = failOf(e);
    // Android's chooser closed without a pick: back to the list (or closed, with no list behind it). A wallet closed before it took
    // the request: a decline.
    if (kind === "cancelled" && !w) return single ? close() : setStep({ v: "list" });
    haptic.error();
    setStep({ v: "fail", w, single, fail: kind === "cancelled" ? "declined" : kind });
  }

  function connected(w: DetectedWallet | null, r: ExternalConnection) {
    const kept = walletState().wallets[C];
    const pkg = w?.pkg ?? r.pkg;
    if (pkg) rememberWalletPackage(pkg);
    // The same account came back (already connected): it just becomes the one in use, with the newest approval.
    const same = kept.find((x) => x.full === r.address);
    if (same) {
      if (r.session && r.session !== same.session) updateWalletSession(C, same.id, r.session);
      const was = walletState().inUse[C] === same.id;
      setWalletInUse(C, same.id);
      out.entry = walletState().wallets[C].find((x) => x.id === same.id) ?? same;
      out.toast = was ? `${same.app} is already connected` : `${same.app} is now in use`;
      haptic.success();
      close();
      return;
    }
    // Only now, after the new wallet connected, is the replaced one removed; the new wallet becomes the one in use.
    const old = replacing.current ? kept.find((x) => x.id === replacing.current) : undefined;
    if (old) removeWallet(C, old.id);
    const entry = addExternalWallet(C, r.app, r.logo, r.address, r.session, r.baseUri, r.icon, pkg);
    out.entry = entry;
    out.toast = old ? `${r.app} connected. ${old.app} removed.` : `${r.app} connected`;
    const done: Done = { name: r.app, icon: w?.icon ?? r.icon ?? null, logo: r.logo, addr: entry.addr };
    // The animation plays when the person is back in Vanna, not behind the wallet.
    if (AppState.currentState === "active") showDone(done);
    else pendingDone.current = done;
  }

  function showDone(d: Done) {
    pendingDone.current = null;
    setStep({ v: "done", ...d });
    timers.current.done = setTimeout(() => alive.current && close(), DONE_MS);
  }

  const cancel = () => {
    req.current++;
    ctl.current?.abort();
    settle();
    haptic.tap();
    if (active.current.single) close();
    else setStep({ v: "list" });
  };
  const another = () => {
    req.current++;
    ctl.current?.abort();
    settle();
    active.current = { ...active.current, single: false };
    setStep({ v: "list" });
  };
  // Open X again: the request still waiting in the wallet is kept and the wallet is brought back to the front. When the wallet
  // can't be brought up (or after Android's chooser, where Vanna doesn't know which wallet it was), a new request replaces it.
  const reopen = () => {
    const { w, single } = active.current;
    if (!w) return connect(null, single);
    const id = req.current;
    launchApp(w.pkg)
      .catch(() => false)
      .then((ok) => {
        if (!ok && alive.current && req.current === id) connect(w, single);
      });
  };
  const retry = () => connect(active.current.w, active.current.single);
  const pick = (w: DetectedWallet) => {
    haptic.tap();
    connect(w, false);
  };
  const replacePick = (id: string) => {
    haptic.tap();
    replacing.current = id;
    void detect();
  };

  const stopAll = () => {
    alive.current = false;
    ctl.current?.abort();
    req.current++;
    detectSeq.current++;
    settle();
    clearTimeout(timers.current.done);
  };

  // start: find the wallets (or ask which one to replace first)
  useEffect(() => {
    if (stepRef.current.v === "detect") void detect();
    // gone (closed, or replaced by another sheet): every pending answer, detection and timer is dropped, and the promise ends
    return () => {
      stopAll();
      onGone();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back to Vanna: play a Connected that arrived behind the wallet, end a wait past the limit, look again when no wallet was found.
  // Leaving Vanna while "Opening X…": Android has switched to the wallet.
  const onApp = useRef<(s: string) => void>(() => {});
  const onBack = useRef<() => boolean>(() => false);
  useEffect(() => {
    onApp.current = (s) => {
      const v = stepRef.current;
      if (s !== "active") {
        if (v.v === "opening") setStep({ v: "waiting", w: v.w, single: v.single });
        return;
      }
      if (pendingDone.current) return showDone(pendingDone.current);
      if ((v.v === "opening" || v.v === "waiting") && Date.now() - active.current.at > CONNECT_MS) return noAnswer(req.current);
      if (v.v === "none") void detect();
    };
    // Back while waiting cancels (to the list, or closes when only one wallet was found); anywhere else the sheet closes as usual.
    onBack.current = () => {
      const v = stepRef.current.v;
      if (v !== "opening" && v !== "waiting") return false;
      cancel();
      return true;
    };
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => onApp.current(s));
    // Registered after the sheet's own Back handler (which runs its effect after this one), so this one is asked first.
    let back: { remove: () => void } | undefined;
    const t = setTimeout(() => (back = BackHandler.addEventListener("hardwareBackPress", () => onBack.current())), 0);
    return () => {
      sub.remove();
      clearTimeout(t);
      back?.remove();
    };
  }, []);

  // While the wallet is asked, a tap outside or a drag down shows a reminder instead of closing.
  const waiting = step.v === "opening" || step.v === "waiting";
  const who = waiting ? (step.w ? step.w.label : "your wallet") : "";
  useEffect(() => {
    guardSheet(waiting, `Waiting for ${who}. Open it again, or tap Cancel.`);
  }, [waiting, who]);

  // The body scrolls inside the sheet's large height with no scrollbar; a soft fade at the bottom edge says there is more.
  const maxBody = Math.max(200, height - insets.top - insets.bottom - 120);
  const [contentH, setContentH] = useState(0);
  const [boxH, setBoxH] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const target = Math.min(contentH, maxBody);
  const bodyH = useSharedValue(-1);
  useEffect(() => {
    if (!contentH) return;
    if (bodyH.value < 0 || rm) bodyH.value = target;
    else bodyH.value = withTiming(target, { duration: 300, easing: EASE });
  }, [target, contentH, rm, bodyH]);
  const bodyStyle = useAnimatedStyle(() => (bodyH.value < 0 ? {} : { height: bodyH.value }));
  const more = contentH > 0 && boxH > 0 && scrollY + boxH < contentH - 2;

  const title = step.v === "replace" ? "Add a wallet" : "Connect a wallet";
  const key = step.v + ("w" in step && step.w ? step.w.pkg : "") + (step.v === "fail" ? step.fail : "");

  let body: ReactNode;
  switch (step.v) {
    case "detect":
      body = <DetectView skel={skel} rm={!!rm} />;
      break;
    case "list":
      body = <GridView wallets={visible(found, last)} last={intro ? last : null} onPick={pick} onOther={() => connect(null, false)} />;
      break;
    case "none":
      body = <NoneView onCheck={() => void detect()} />;
      break;
    case "all":
      body = <AllView onClose={close} />;
      break;
    case "replace":
      body = <ReplaceView onPick={replacePick} onCancel={close} />;
      break;
    case "opening":
    case "waiting":
      body = <WaitView step={step} onCancel={cancel} onAnother={another} onReopen={reopen} rm={!!rm} />;
      break;
    case "fail":
      body = <FailView step={step} onRetry={retry} onAnother={another} rm={!!rm} />;
      break;
    case "done":
      body = <LinkDone d={step} rm={!!rm} />;
      break;
  }

  return (
    <View>
      <View style={styles.head}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">
          {title}
        </Text>
        <Pressable
          onPress={() => (waiting ? cancel() : close())}
          accessibilityRole="button"
          accessibilityLabel={waiting ? "Cancel" : "Close"}
          style={styles.x}
          hitSlop={4}
        >
          <View style={[styles.xIn, { backgroundColor: colors.segment }]}>
            <Icon name="close" size={22} />
          </View>
        </Pressable>
      </View>
      <Animated.View style={[styles.clip, bodyStyle]}>
        <ScrollView
          style={[styles.scroll, { maxHeight: maxBody }]}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          bounces={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
          onLayout={(e) => setBoxH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_w, h) => setContentH(h)}
        >
          <View key={key}>{body}</View>
        </ScrollView>
        {more && <LinearGradient pointerEvents="none" colors={[colors.surface + "00", colors.surface]} style={styles.fade} />}
      </Animated.View>
    </View>
  );
}

/* ---------------------------------------------------------------------- views */

const Rise = ({ i, children, style }: { i: number; children: ReactNode; style?: StyleProp<ViewStyle> }) => (
  <RiseIn delay={i * 40} distance={8} duration={420} style={style}>
    {children}
  </RiseIn>
);

function Sub({ text }: { text: string }) {
  const { colors } = useTheme();
  return <Text style={[styles.sub, { color: colors.muted }]}>{text}</Text>;
}

function DetectView({ skel, rm }: { skel: boolean; rm: boolean }) {
  // Laid out from the first frame (so the sheet opens at its size) and shown only once the skeleton is due.
  const o = useSharedValue(0);
  useEffect(() => {
    o.value = skel ? withTiming(1, { duration: rm ? 0 : 200 }) : 0;
  }, [skel, rm, o]);
  const st = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <View>
      <Rise i={0}>
        <Sub text="Looking for wallet apps on this phone…" />
      </Rise>
      <Animated.View style={[styles.grid, st]} accessibilityState={{ busy: true }}>
        {[[56, 36], [48, 30], [60, 40]].map(([a, b], k) => (
          <View key={k} style={styles.cell}>
            <View style={styles.tile}>
              <SkelBox w={48} h={48} r={14} rm={rm} />
              <View style={{ alignItems: "center", gap: 6 }}>
                <SkelBox w={a} h={9} r={5} rm={rm} />
                <SkelBox w={b} h={9} r={5} rm={rm} />
              </View>
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

function SkelBox({ w, h, r, rm }: { w: number; h: number; r: number; rm: boolean }) {
  const { isDark } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    if (rm) return;
    p.value = withRepeat(withTiming(1, { duration: 1100, easing: EASE }), -1);
    return () => cancelAnimation(p);
  }, [rm, p]);
  const st = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(p.value, [0, 1], [-w, w]) }] }));
  const hi = isDark ? "#353535" : "#F6F6F8";
  return (
    <View style={{ width: w, height: h, borderRadius: r, overflow: "hidden", backgroundColor: isDark ? "#2A2A2A" : "#E9E9EC" }}>
      {!rm && (
        <Animated.View style={[StyleSheet.absoluteFill, st]}>
          <LinearGradient colors={[hi + "00", hi, hi + "00"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}

function GridView({ wallets, last, onPick, onOther }: { wallets: DetectedWallet[]; last: string | null; onPick: (w: DetectedWallet) => void; onOther: () => void }) {
  const { colors, isDark } = useTheme();
  const press = isDark ? "rgba(255,255,255,0.06)" : "rgba(17,17,17,0.06)";
  return (
    <View>
      <Rise i={0}>
        <Sub text="Pick your wallet. You'll approve in that app." />
      </Rise>
      <Rise i={1} style={styles.grid}>
        {wallets.map((w) => {
          const tag = w.pkg === last ? "Last used" : "";
          return (
            <View key={w.pkg} style={styles.cell}>
              <Pressable
                onPress={() => onPick(w)}
                accessibilityRole="button"
                accessibilityLabel={`${w.label}${tag ? ", last used" : ""}`}
                style={({ pressed }) => [styles.tile, pressed && { backgroundColor: press, transform: [{ scale: 0.97 }] }]}
              >
                {!!tag && (
                  <View style={styles.badgeRow} pointerEvents="none">
                    <View style={[styles.badge, { backgroundColor: colors.purpleTint }]}>
                      <Text style={[styles.badgeT, { color: colors.onPurpleTint }]}>{tag}</Text>
                    </View>
                  </View>
                )}
                <AppIcon icon={w.icon} size={48} radius={14} />
                <Text style={[styles.gname, { color: colors.text }]} numberOfLines={2}>
                  {w.label}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </Rise>
      <Rise i={2} style={{ marginTop: 8 }}>
        <Pressable
          onPress={onOther}
          accessibilityRole="button"
          accessibilityLabel="Can't see your wallet? Open your phone's wallet list"
          style={({ pressed }) => [styles.alt, pressed && { backgroundColor: press }]}
        >
          <View style={[styles.altIc, { borderColor: colors.border }]}>
            <AppsGlyph color={colors.muted} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.altT, { color: colors.text }]}>Can&apos;t see your wallet?</Text>
            <Text style={[styles.altS, { color: colors.muted }]}>Open your phone&apos;s wallet list</Text>
          </View>
          <View style={{ opacity: 0.8 }}>
            <Icon name="chevron_right" size={20} color="muted" />
          </View>
        </Pressable>
      </Rise>
    </View>
  );
}

function Centre({ icon, title, line, alert, children }: { icon: ReactNode; title: string; line: string; alert?: boolean; children?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={styles.centre}>
        <Rise i={0}>{icon}</Rise>
        <Rise i={1}>
          <Text style={[styles.h3, { color: colors.text }]} accessibilityRole={alert ? "alert" : "header"} accessibilityLiveRegion="polite">
            {title}
          </Text>
        </Rise>
        <Rise i={2}>
          <Text style={[styles.p, { color: colors.muted }]}>{line}</Text>
        </Rise>
      </View>
      <Rise i={3} style={styles.acts}>
        {children}
      </Rise>
    </View>
  );
}

function NoneView({ onCheck }: { onCheck: () => void }) {
  const { colors } = useTheme();
  return (
    <Centre
      icon={
        <View style={[styles.empty, { backgroundColor: colors.purpleTint }]}>
          <WalletGlyph size={30} color={colors.onPurpleTint} />
        </View>
      }
      title="No wallet app found"
      line="Install any Solana wallet app that supports Mobile Wallet Adapter, then come back here."
    >
      <TextBtn
        label="See wallets that work with Vanna"
        a11y="See wallets that work with Vanna, opens solanamobile.com"
        ext
        onPress={() => Linking.openURL(LIST_URL).catch(() => toast("Couldn't open the browser", "err"))}
      />
      <Pill label="Check again" onPress={onCheck} />
    </Centre>
  );
}

function AllView({ onClose }: { onClose: () => void }) {
  const { colors } = useTheme();
  return (
    <Centre
      icon={
        <View style={[styles.empty, { backgroundColor: colors.purpleTint }]}>
          <CheckGlyph size={28} color={colors.onPurpleTint} />
        </View>
      }
      title="Nothing new to add"
      line="All your wallet apps are already connected."
    >
      <Outline label="Close" onPress={onClose} />
    </Centre>
  );
}

function ReplaceView({ onPick, onCancel }: { onPick: (id: string) => void; onCancel: () => void }) {
  const { colors, isDark } = useTheme();
  const press = isDark ? "rgba(255,255,255,0.06)" : "rgba(17,17,17,0.06)";
  const st = walletState();
  // the one in use first
  const rows = [...st.wallets[C]].sort((a, b) => (a.id === st.inUse[C] ? -1 : b.id === st.inUse[C] ? 1 : 0));
  return (
    <View>
      <Rise i={0}>
        <Sub text={`You can keep ${MAX_WALLETS} wallets. Which one should this replace?`} />
      </Rise>
      <Rise i={1} style={[styles.group, { backgroundColor: colors.bg }]}>
        {rows.map((w, k) => {
          const on = w.id === st.inUse[C];
          return (
            <Pressable
              key={w.id}
              onPress={() => onPick(w.id)}
              accessibilityRole="button"
              accessibilityLabel={`Replace ${w.app}, ${w.addr}${on ? ", in use" : ""}`}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: press }]}
            >
              {k > 0 && <View style={[styles.rowLine, { backgroundColor: colors.border }]} />}
              <WalletLogo logo={w.logo} icon={w.icon} size={40} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.rowT, { color: colors.text }]} numberOfLines={1}>
                  {w.app}
                </Text>
                <Text style={[styles.rowS, { color: colors.muted }]}>{w.addr}</Text>
              </View>
              {on && (
                <View style={[styles.tag, { backgroundColor: colors.purpleTint }]}>
                  <Text style={[styles.tagT, { color: colors.onPurpleTint }]}>In use</Text>
                </View>
              )}
              <View style={{ opacity: 0.8 }}>
                <Icon name="chevron_right" size={20} color="muted" />
              </View>
            </Pressable>
          );
        })}
      </Rise>
      <Rise i={2} style={styles.acts}>
        <Outline label="Cancel" onPress={onCancel} />
      </Rise>
    </View>
  );
}

function WaitView({
  step, onCancel, onAnother, onReopen, rm,
}: {
  step: { v: "opening" | "waiting"; w: DetectedWallet | null; single: boolean };
  onCancel: () => void;
  onAnother: () => void;
  onReopen: () => void;
  rm: boolean;
}) {
  const n = step.w ? step.w.label : "your wallet";
  const N = step.w ? step.w.label : "Your wallet";
  if (step.v === "waiting") {
    return (
      <Centre icon={<Hero w={step.w} badge="spin" rm={rm} />} title={`Waiting for ${n}`} line={`Approve the connection in ${n}. You'll come back here after.`}>
        <Pill label={step.w ? `Open ${n} again` : "Open your wallet again"} onPress={onReopen} />
        <Outline label="Cancel" onPress={onCancel} />
      </Centre>
    );
  }
  return (
    <Centre icon={<Hero w={step.w} badge="spin" halo rm={rm} />} title={`Opening ${n}…`} line={`${N} will ask you to connect to Vanna.`}>
      <Outline label="Cancel" onPress={onCancel} />
      {step.single && <TextBtn label="Use a different wallet" onPress={onAnother} />}
    </Centre>
  );
}

function FailView({ step, onRetry, onAnother, rm }: { step: { w: DetectedWallet | null; fail: Fail }; onRetry: () => void; onAnother: () => void; rm: boolean }) {
  const n = step.w ? step.w.label : "your wallet";
  const N = step.w ? step.w.label : "Your wallet";
  const [title, line] =
    step.fail === "declined"
      ? ["Connection declined", `You declined it in ${n}. Nothing was shared.`]
      : step.fail === "timeout"
        ? [`${N} didn't answer`, `Nothing was shared. Open ${n}, check it's unlocked, then tap Try again.`]
        : ["Couldn't connect", `${N} didn't share an account. Check it's set to Mainnet, then try again.`];
  return (
    <Centre icon={<Hero w={step.w} badge="bad" rm={rm} />} title={title} line={line} alert>
      <Pill label="Try again" onPress={onRetry} />
      <Outline label="Choose another wallet" onPress={onAnother} />
    </Centre>
  );
}

/* ---------------------------------------------------------------------- icons */

// The wallet app's own icon from Android (with a hairline ring so a dark icon doesn't vanish into the sheet), or the generic tile.
function AppIcon({ icon, size, radius }: { icon: string | null; size: number; radius: number }) {
  const { colors, isDark } = useTheme();
  const ring = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,17,17,0.08)";
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden", backgroundColor: icon ? undefined : colors.segment, alignItems: "center", justifyContent: "center" }}>
      {icon ? (
        <Image source={{ uri: icon }} style={{ width: size, height: size }} contentFit="cover" accessible={false} />
      ) : (
        <WalletGlyph size={Math.round(size * 0.5)} color={colors.muted} />
      )}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, borderWidth: 1, borderColor: icon ? ring : colors.border }]} />
    </View>
  );
}

function Hero({ w, badge, halo, rm }: { w: DetectedWallet | null; badge: "spin" | "bad"; halo?: boolean; rm: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.hero}>
      {halo && !rm && <Halo />}
      {w ? <AppIcon icon={w.icon} size={64} radius={18} /> : <GenericTile size={64} radius={18} glyph={30} />}
      <View style={[styles.hBadge, { backgroundColor: colors.surface }]}>{badge === "spin" ? <Spinner rm={rm} /> : <Bad rm={rm} />}</View>
    </View>
  );
}

function GenericTile({ size, radius, glyph }: { size: number; radius: number; glyph: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.segment, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
      <WalletGlyph size={glyph} color={colors.muted} />
    </View>
  );
}

function Halo() {
  const { isDark } = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1600, easing: EASE }), -1);
    return () => cancelAnimation(p);
  }, [p]);
  const st = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - p.value), transform: [{ scale: 0.9 + 0.35 * p.value }] }));
  return <Animated.View pointerEvents="none" style={[styles.halo, { borderColor: isDark ? "#CBB6FA" : "#703AE6" }, st]} />;
}

function Spinner({ rm }: { rm: boolean }) {
  const { isDark } = useTheme();
  const r = useSharedValue(0);
  useEffect(() => {
    if (rm) return;
    r.value = withRepeat(withTiming(360, { duration: 900, easing: Easing.linear }), -1);
    return () => cancelAnimation(r);
  }, [rm, r]);
  const st = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  const base = isDark ? "#3A2A6B" : "#F1EBFD";
  return <Animated.View style={[styles.spin, { borderColor: base, borderTopColor: rm ? base : isDark ? "#CBB6FA" : "#703AE6" }, st]} />;
}

function Bad({ rm }: { rm: boolean }) {
  const { colors } = useTheme();
  const p = useSharedValue(rm ? 1 : 0);
  useEffect(() => {
    if (!rm) p.value = withTiming(1, { duration: 380, easing: SPRING_EASE });
  }, [rm, p]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: 0.4 + 0.6 * p.value }] }));
  return (
    <Animated.View style={[styles.bad, { backgroundColor: colors.pinkTint }, st]}>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="M12 6v8M12 18.5v.5" stroke={colors.onPinkTint} strokeWidth={3} strokeLinecap="round" fill="none" />
      </Svg>
    </Animated.View>
  );
}

function WalletGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={6.5} width={18} height={13} rx={3} stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M6.5 6.5V6a2 2 0 0 1 2-2H17" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M15.5 13h2.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
function CheckGlyph({ size, color }: { size: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
function AppsGlyph({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
      <Rect x={4} y={4} width={6} height={6} rx={1.5} />
      <Rect x={14} y={4} width={6} height={6} rx={1.5} />
      <Rect x={4} y={14} width={6} height={6} rx={1.5} />
      <Rect x={14} y={14} width={6} height={6} rx={1.5} />
    </Svg>
  );
}

/* ---------------------------------------------------------------------- buttons */

function Pill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.pill, pressed && { transform: [{ scale: 0.97 }], opacity: 0.9 }]}>
      <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      <Text style={styles.pillT}>{label}</Text>
    </Pressable>
  );
}
function Outline({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.obtn, { borderColor: colors.borderControl }, pressed && { transform: [{ scale: 0.97 }] }]}>
      <Text style={[styles.obtnT, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}
function TextBtn({ label, onPress, ext, a11y }: { label: string; onPress: () => void; ext?: boolean; a11y?: string }) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={ext ? "link" : "button"}
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => [styles.tbtn, pressed && { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(17,17,17,0.06)" }]}
    >
      <Text style={[styles.tbtnT, { color: colors.link }]}>{label}</Text>
      {ext && <Icon name="open_in_new" size={18} color={colors.link} />}
    </Pressable>
  );
}

/* ---------------------------------------------------------------------- Connected: the Vanna mark links with the wallet */

const AnimatedLine = Animated.createAnimatedComponent(Line);
const MID = 96; // the gap between the two icons
const LINE = MID - 4; // the drawn line, 2 px in from each end

// Plays once when the wallet approves (about 1.2 s): both icons scale in, a lilac pulse travels from Vanna to the wallet, a solid line
// draws over the dotted one and both icons nudge, a check pops in the middle, then the title rises in. Reduce motion: the final frame.
function LinkDone({ d, rm }: { d: Done; rm: boolean }) {
  const { colors, isDark } = useTheme();
  const v0 = rm ? 1 : 0;
  const inL = useSharedValue(v0);
  const inR = useSharedValue(v0);
  const nudgeL = useSharedValue(1);
  const nudgeR = useSharedValue(1);
  const dot = useSharedValue(rm ? 1 : 0);
  const draw = useSharedValue(v0);
  const check = useSharedValue(v0);
  const head = useSharedValue(v0);
  const line = useSharedValue(v0);
  useEffect(() => {
    if (rm) {
      haptic.success();
      return;
    }
    const t = (ms: number, e = EASE) => ({ duration: ms, easing: e });
    const nudge = () => withSequence(withTiming(1.06, t(150)), withTiming(1, t(150)));
    inL.value = withTiming(1, t(360));
    inR.value = withDelay(80, withTiming(1, t(360)));
    dot.value = withDelay(200, withTiming(1, t(520, Easing.bezier(0.45, 0, 0.25, 1))));
    draw.value = withDelay(420, withTiming(1, t(420)));
    nudgeL.value = withDelay(700, nudge());
    nudgeR.value = withDelay(720, nudge());
    check.value = withDelay(820, withTiming(1, t(380, SPRING_EASE)));
    head.value = withDelay(880, withTiming(1, t(320)));
    line.value = withDelay(940, withTiming(1, t(320)));
    const h = setTimeout(() => haptic.success(), 820);
    return () => clearTimeout(h);
  }, [rm, inL, inR, dot, draw, nudgeL, nudgeR, check, head, line]);

  const endL = useAnimatedStyle(() => ({ opacity: inL.value, transform: [{ scale: (0.85 + 0.15 * inL.value) * nudgeL.value }] }));
  const endR = useAnimatedStyle(() => ({ opacity: inR.value, transform: [{ scale: (0.85 + 0.15 * inR.value) * nudgeR.value }] }));
  const dotSt = useAnimatedStyle(() => ({
    opacity: interpolate(dot.value, [0, 0.15, 0.85, 1], [0, 1, 1, 0]),
    transform: [{ translateX: dot.value * MID }],
  }));
  const drawProps = useAnimatedProps(() => ({ strokeDashoffset: (1 - draw.value) * LINE }));
  const checkSt = useAnimatedStyle(() => ({ opacity: Math.min(1, check.value), transform: [{ scale: 0.3 + 0.7 * check.value }] }));
  const headSt = useAnimatedStyle(() => ({ opacity: head.value, transform: [{ translateY: (1 - head.value) * 6 }] }));
  const lineSt = useAnimatedStyle(() => ({ opacity: line.value, transform: [{ translateY: (1 - line.value) * 6 }] }));

  const ring = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,17,17,0.08)";
  const lilac = isDark ? "#CBB6FA" : "#703AE6";
  const wallet = d.icon ? (
    <AppIcon icon={d.icon} size={48} radius={14} />
  ) : shipped(d.logo) ? (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: ring, overflow: "hidden" }}>
      <WalletLogo logo={d.logo} size={46} />
    </View>
  ) : (
    <GenericTile size={48} radius={14} glyph={24} />
  );
  return (
    <View style={[styles.centre, { paddingBottom: 16 }]}>
      <View style={styles.link} accessible accessibilityRole="image" accessibilityLabel={`Vanna linked with ${d.name}`}>
        <Animated.View style={[styles.lkEnd, endL]}>
          <View style={[styles.lkVm, { backgroundColor: colors.bg, borderColor: ring }]}>
            <VannaMark size={30} />
          </View>
        </Animated.View>
        <View style={styles.lkMid}>
          <Svg width={MID} height={4} style={styles.lkLine}>
            <Line x1={2} y1={2} x2={MID - 2} y2={2} stroke={colors.borderControl} strokeWidth={2} strokeDasharray={[2, 5]} strokeLinecap="round" opacity={0.6} />
            <AnimatedLine x1={2} y1={2} x2={MID - 2} y2={2} stroke={lilac} strokeWidth={2.5} strokeLinecap="round" strokeDasharray={[LINE, LINE]} animatedProps={drawProps} />
          </Svg>
          {!rm && (
            <Animated.View pointerEvents="none" style={[styles.lkDot, dotSt]}>
              <Svg width={22} height={22}>
                <Circle cx={11} cy={11} r={11} fill={lilac} opacity={0.25} />
                <Circle cx={11} cy={11} r={5} fill={lilac} />
              </Svg>
            </Animated.View>
          )}
          <Animated.View style={[styles.lkCheck, { borderColor: colors.surface }, checkSt]}>
            <CheckGlyph size={14} color="#FFFFFF" />
          </Animated.View>
        </View>
        <Animated.View style={[styles.lkEnd, endR]}>{wallet}</Animated.View>
      </View>
      <Animated.Text style={[styles.h3, { color: colors.text }, headSt]} accessibilityLiveRegion="polite">
        Connected
      </Animated.Text>
      <Animated.Text style={[styles.addr, { color: colors.muted }, lineSt]} numberOfLines={1}>
        {d.name} · {d.addr}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", alignItems: "center", minHeight: 56, paddingLeft: 4, marginRight: -8 },
  title: { flex: 1, minWidth: 0, fontFamily: font.semibold, fontSize: 20, lineHeight: 28 },
  x: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  xIn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  clip: { overflow: "hidden" },
  scroll: { flexGrow: 0, flexShrink: 0 },
  fade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 28 },
  sub: { marginTop: 2, marginHorizontal: 4, marginBottom: 14, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  // 3 columns with an 8 px gap: each cell carries half the gap on every side
  grid: { flexDirection: "row", flexWrap: "wrap", margin: -4 },
  cell: { width: "33.333%", padding: 4 },
  tile: { alignItems: "center", gap: 8, minHeight: 108, paddingTop: 22, paddingHorizontal: 6, paddingBottom: 10, borderRadius: 16 },
  gname: { fontFamily: font.semibold, fontSize: 12.5, lineHeight: 16, textAlign: "center", maxWidth: "100%" },
  badgeRow: { position: "absolute", top: 4, left: 0, right: 0, alignItems: "center" },
  badge: { paddingHorizontal: 6, borderRadius: 8 },
  badgeT: { fontFamily: font.semibold, fontSize: 10.5, lineHeight: 16 },
  alt: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingVertical: 10, paddingLeft: 14, paddingRight: 12, borderRadius: 16 },
  altIc: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  altT: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21 },
  altS: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  centre: { alignItems: "center", paddingTop: 16, paddingHorizontal: 8, paddingBottom: 4 },
  h3: { marginTop: 16, fontFamily: font.semibold, fontSize: 20, lineHeight: 28, textAlign: "center" },
  p: { marginTop: 6, fontFamily: font.regular, fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 300 },
  addr: { marginTop: 6, fontFamily: font.regular, fontSize: 14, lineHeight: 20, fontVariant: ["tabular-nums"] },
  acts: { gap: 8, marginTop: 22 },
  empty: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  hero: { width: 64, height: 64 },
  hBadge: { position: "absolute", right: -6, bottom: -6, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  halo: { position: "absolute", left: -6, top: -6, right: -6, bottom: -6, borderRadius: 24, borderWidth: 2 },
  spin: { width: 22, height: 22, borderRadius: 11, borderWidth: 2.5 },
  bad: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  group: { borderRadius: 16, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 10, paddingLeft: 14, paddingRight: 12 },
  rowLine: { position: "absolute", top: 0, left: 66, right: 0, height: 1 },
  rowT: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  rowS: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, fontVariant: ["tabular-nums"] },
  tag: { paddingHorizontal: 8, borderRadius: 11 },
  tagT: { fontFamily: font.semibold, fontSize: 12, lineHeight: 22 },
  pill: { height: 52, borderRadius: 26, overflow: "hidden", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 },
  pillT: { fontFamily: font.semibold, fontSize: 16, color: "#FFFFFF" },
  obtn: { height: 52, borderRadius: 26, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  obtnT: { fontFamily: font.semibold, fontSize: 16 },
  tbtn: { minHeight: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  tbtnT: { fontFamily: font.semibold, fontSize: 15 },
  link: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 4, marginBottom: 2 },
  lkEnd: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  lkVm: { width: 48, height: 48, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  lkMid: { width: MID, height: 28, marginHorizontal: 6 },
  lkLine: { position: "absolute", left: 0, top: 12 },
  lkDot: { position: "absolute", top: 3, left: -11 },
  lkCheck: { position: "absolute", left: MID / 2 - 17, top: 14 - 17, width: 34, height: 34, borderRadius: 17, borderWidth: 4, backgroundColor: "#703AE6", alignItems: "center", justifyContent: "center" },
});
