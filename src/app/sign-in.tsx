import { LinearGradient } from "expo-linear-gradient";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CHAIN_LOGO, TokenLogo, VannaMark, Wordmark } from "@/components/brand";
import { CodeInput } from "@/components/code-input";
import { Icon } from "@/components/ui/icon";
import { WalletLogo } from "@/components/wallet-logo";
import { TailLoader } from "@/mascot/tail-loader";
import { setRewards, useRewards } from "@/sample/rewards";
import { CHAIN_LABEL, type Chain, useChain } from "@/state/chain";
import { markWelcomeSeen } from "@/state/session";
import * as dynamic from "@/chain/dynamic";
import { addEmbedded, connectWallet, markAskedOther, signInWithEmail, walletState, WALLET_APPS, type WalletApp } from "@/state/wallets";
import { BRAND_GRADIENT, font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";
import { openSheet, toast } from "@/ui/overlay";

/* Sign in / create account (style A on plain black). Email (6-digit code), Google, X, or a wallet app for the chain
   picked in the switch. After the first wallet, one skippable step offers the other chain. New accounts pick a display
   name. ?mode=new|back, or ?add=solana|stellar from Account > Wallets (wallets for that chain only).
   In Expo Go the wallet apps, Google and X are stand-ins; the development build opens the real ones (Dynamic, the
   Android wallet connection, WalletConnect). */
type Step = "main" | "code" | "other" | "name";
const other = (c: Chain): Chain => (c === "solana" ? "stellar" : "solana");
const BG = "#000000", SF = "#161618", BC = "#3A3944", MU = "#A9A9B2", LK = "#CBB6FA";
const RESEND_MS = 30_000;

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; add?: string }>();
  const add = params.add === "solana" || params.add === "stellar" ? (params.add as Chain) : null;
  const mode = add ? "add" : params.mode === "back" ? "back" : "new";
  const { chain: appChain, setChain } = useChain();
  const [chain, setTabChain] = useState<Chain>(add ?? appChain);
  const [step, setStep] = useState<Step>("main");
  const [email, setEmail] = useState("");
  const [emailFor, setEmailFor] = useState<Chain | null>(null); // email for one chain only (from the "other" step)
  const [code, setCode] = useState("");
  const [connected, setConnected] = useState<{ app: WalletApp; logo: string; chain: Chain; addr: string } | null>(null);
  const me = useRewards();
  const [name, setName] = useState(me.name);
  const [verifying, setVerifying] = useState(false);
  const checking = useRef(false); // the last digit can fire twice before verifying is set
  const [codeErr, setCodeErr] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState(0);
  const [resendAt, setResendAt] = useState(0);
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (step !== "code") return;
    const tick = () => setWait(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [step, resendAt]);

  const finish = () => {
    markWelcomeSeen();
    if (add) router.back();
    else router.replace("/portfolio" as Href);
  };
  const afterAuth = (fromWallet: boolean) => {
    if (mode === "add") return finish();
    if (fromWallet && mode === "new" && !walletState().askedOther && walletState().wallets[other(chain)].length === 0) return setStep("other");
    if (mode === "new") return setStep("name");
    finish();
  };

  const approveWallet = (c: Chain, app: WalletApp, logo: string) => {
    openSheet({
      title: "",
      content: (close) => (
        <View style={{ gap: 14, paddingBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <WalletLogo logo={logo} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={s.sheetT}>Connect {app}</Text>
              <Text style={s.sheetS}>{CHAIN_LABEL[c]} · {app} opens to approve</Text>
            </View>
          </View>
          <View style={s.note}>
            <Icon name="info" size={18} color={LK} />
            <Text style={[s.sheetS, { flex: 1 }]}>You approve the connection once. After that, switching to it needs no approval.</Text>
          </View>
          <Pressable
            onPress={() => {
              const w = connectWallet(c, app, logo);
              haptic.success();
              setConnected({ app, logo, chain: c, addr: w.addr });
              if (c !== appChain && !add) setChain(c);
              close();
              setTimeout(() => afterAuth(true), 250);
            }}
            style={s.cta}
            accessibilityRole="button"
          >
            <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Text style={s.ctaT}>Approve in {app}</Text>
          </Pressable>
          <Pressable onPress={close} style={s.quiet} accessibilityRole="button">
            <Text style={[s.ctaT, { color: LK }]}>Cancel</Text>
          </Pressable>
        </View>
      ),
    });
  };

  const social = (method: "google" | "x") => {
    const label = method === "google" ? "Google" : "X";
    // The real build has no Google or X connection yet, and must never sign someone in with a made-up account.
    if (dynamic.available) return toast(`${label} sign-in is coming soon. Use email for now.`);
    openSheet({
      title: "",
      content: (close) => (
        <View style={{ gap: 14, paddingBottom: 8 }}>
          <Text style={s.sheetT}>Continue with {label}</Text>
          <Text style={s.sheetS}>Vanna gets your name and email only, and creates a Solana and a Stellar wallet for you.</Text>
          <Pressable
            onPress={() => {
              signInWithEmail(method, method === "google" ? "maya@gmail.com" : "maya@x.com");
              haptic.success();
              close();
              setTimeout(() => afterAuth(false), 250);
            }}
            style={s.cta}
            accessibilityRole="button"
          >
            <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <Text style={s.ctaT}>Continue as Maya</Text>
          </Pressable>
          <Pressable onPress={close} style={s.quiet} accessibilityRole="button">
            <Text style={[s.ctaT, { color: LK }]}>Cancel</Text>
          </Pressable>
        </View>
      ),
    });
  };

  const sendCode = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return toast("Enter an email like name@example.com", "err");
    haptic.tap();
    // Development build: Dynamic emails the real code. Expo Go has no native module, so the preview code step stands in.
    if (dynamic.available) dynamic.sendEmailCode(email.trim()).catch((e: Error) => toast(e.message || "Couldn't send the code", "err"));
    setCode("");
    setCodeErr(null);
    setResendAt(Date.now() + RESEND_MS);
    setStep("code");
  };
  const resend = () => {
    sendCode();
    toast("New code sent");
  };
  const codeDone = async (v: string) => {
    if (v.length < 6 || checking.current) return;
    checking.current = true;
    setVerifying(true);
    // Dynamic verifies the code and returns this email's Solana and Stellar wallets; Expo Go accepts any 6 digits.
    let real: { solana?: string; stellar?: string } = {};
    try {
      if (dynamic.available) {
        const ses = await dynamic.verifyEmailCode(v);
        real = { solana: ses.solanaAddress, stellar: ses.stellarAddress };
        // Never carry on with a made-up address in a build that has real wallets.
        const needed: Chain[] = add ? [add] : emailFor ? [emailFor] : ["solana", "stellar"];
        if (needed.some((c) => !real[c])) throw new Error("Your wallets are still being set up. Send a new code in a moment.");
      }
    } catch (e) {
      haptic.error();
      setCode("");
      setCodeErr((e as Error).message || "That code didn't work");
      setErrorKey((k) => k + 1);
      return;
    } finally {
      checking.current = false;
      setVerifying(false);
    }
    haptic.success();
    if (add) {
      addEmbedded(add, email.trim(), real[add]);
      return finish();
    }
    if (emailFor) {
      addEmbedded(emailFor, email.trim(), real[emailFor]);
      markAskedOther();
      setEmailFor(null);
      return setStep("name");
    }
    signInWithEmail("email", email.trim(), real);
    afterAuth(false);
  };

  const back = () => {
    if (verifying) return;
    if (step === "main") return router.back();
    if (step === "code") return setStep(emailFor ? "other" : "main");
    if (step === "other" || step === "name") return finish();
  };

  const wallets = (c: Chain) => (
    <View style={s.grid}>
      {WALLET_APPS[c].map((w) => {
        // Wallet apps aren't connected in the real build yet, so they can't hand out a made-up address there.
        const soon = w.soon || dynamic.available;
        return (
          <Pressable
            key={w.app}
            disabled={soon}
            onPress={() => approveWallet(c, w.app, w.logo)}
            style={[s.tile, soon && { opacity: 0.5 }]}
            accessibilityRole="button"
            accessibilityLabel={soon ? `${w.app}, coming soon` : `Connect ${w.app}`}
          >
            {soon && (
              <View style={s.soon}>
                <Text style={s.soonT}>SOON</Text>
              </View>
            )}
            <WalletLogo logo={w.logo} size={40} />
            <Text style={s.tileT}>{w.app}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  const title = mode === "add" ? `Add a ${CHAIN_LABEL[chain]} wallet` : mode === "back" ? "Welcome back" : "Create your account";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[s.body, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={back} style={s.back} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Icon name="arrow_back" size={22} color="#FFFFFF" />
        </Pressable>

        {step === "main" && (
          <>
            <View style={{ gap: 8, marginTop: 18 }}>
              <VannaMark size={40} />
              <Text style={s.h}>{title}</Text>
              <Text style={s.sub}>{mode === "add" ? "It joins your list; you pick which one is in use." : mode === "back" ? "Use the same sign-in as on test.vanna.finance." : "One sign-in for Solana and Stellar."}</Text>
            </View>
            {mode !== "add" && (
              <>
                <View style={s.field}>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email address"
                    placeholderTextColor={MU}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="go"
                    onSubmitEditing={sendCode}
                    style={s.input}
                    accessibilityLabel="Email address"
                  />
                  <Pressable onPress={sendCode} style={s.go} accessibilityRole="button" accessibilityLabel="Continue with email">
                    <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <View><Icon name="arrow_forward" size={20} color="#FFFFFF" /></View>
                  </Pressable>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable onPress={() => social("google")} style={s.pill} accessibilityRole="button">
                    <TokenLogo sym="GOOGLE" size={20} />
                    <Text style={s.pillT}>Google</Text>
                  </Pressable>
                  <Pressable onPress={() => social("x")} style={s.pill} accessibilityRole="button">
                    <Text style={[s.pillT, { fontSize: 17 }]}>𝕏</Text>
                    <Text style={s.pillT}>X</Text>
                  </Pressable>
                </View>
                <View style={s.or}>
                  <View style={s.orLine} />
                  <Text style={s.orT}>OR CONNECT A {CHAIN_LABEL[chain].toUpperCase()} WALLET</Text>
                  <View style={s.orLine} />
                </View>
                <View style={s.seg} accessibilityRole="tablist">
                  {(["solana", "stellar"] as Chain[]).map((c) => (
                    <Pressable key={c} onPress={() => setTabChain(c)} style={[s.segI, chain === c && { backgroundColor: "#2C2C30" }]} accessibilityRole="tab" accessibilityState={{ selected: chain === c }}>
                      <TokenLogo sym={CHAIN_LOGO[c]} size={18} />
                      <Text style={[s.segT, { color: chain === c ? "#FFFFFF" : MU }]}>{CHAIN_LABEL[c]}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
            {wallets(chain)}
            {mode === "add" && !walletState().wallets[chain].some((w) => w.kind === "embedded") && (
              <>
                <View style={s.or}>
                  <View style={s.orLine} />
                  <Text style={s.orT}>OR USE EMAIL FOR {CHAIN_LABEL[chain].toUpperCase()}</Text>
                  <View style={s.orLine} />
                </View>
                <View style={s.field}>
                  <TextInput value={email} onChangeText={setEmail} placeholder="Email address" placeholderTextColor={MU} keyboardType="email-address" autoCapitalize="none" returnKeyType="go" onSubmitEditing={sendCode} style={s.input} accessibilityLabel="Email address" />
                  <Pressable onPress={sendCode} style={s.go} accessibilityRole="button" accessibilityLabel="Continue with email">
                    <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                    <View><Icon name="arrow_forward" size={20} color="#FFFFFF" /></View>
                  </Pressable>
                </View>
              </>
            )}
            <View style={{ flex: 1, minHeight: 24 }} />
            <Text style={s.fine}>Your email gives you a Solana and a Stellar wallet, secured by Dynamic. Vanna never holds your keys.</Text>
          </>
        )}

        {step === "code" && (
          <>
            <View style={s.lockup} accessibilityLabel="Vanna">
              <VannaMark size={40} />
              <Wordmark height={20} />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={s.h}>Enter the code</Text>
              <Text style={s.sub}>We sent a 6-digit code to</Text>
              <View style={s.emailRow}>
                <Text style={s.emailT} numberOfLines={1}>{email.trim()}</Text>
                <Pressable onPress={back} disabled={verifying} hitSlop={10} accessibilityRole="button" accessibilityLabel="Change email">
                  <Text style={s.linkT}>Change</Text>
                </Pressable>
              </View>
            </View>
            <CodeInput
              value={code}
              busy={verifying}
              error={!!codeErr}
              errorKey={errorKey}
              onChange={(d) => {
                setCodeErr(null);
                setCode(d);
                void codeDone(d);
              }}
            />
            {(verifying || codeErr) && <View style={s.codeFoot}>
              {verifying ? (
                <>
                  <TailLoader size={22} />
                  <Text style={s.footT}>Checking your code and getting your wallets ready…</Text>
                </>
              ) : codeErr ? (
                <Text style={[s.footT, { color: "#FF6B72" }]}>{codeErr}</Text>
              ) : null}
            </View>}
            {!verifying && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={s.footT}>{"Didn't get it?"}</Text>
                {wait > 0 ? (
                  <Text style={s.footT}>Send again in {wait}s</Text>
                ) : (
                  <Pressable onPress={resend} hitSlop={10} accessibilityRole="button">
                    <Text style={s.linkT}>Send a new code</Text>
                  </Pressable>
                )}
              </View>
            )}
            <View style={{ flex: 1, minHeight: 16 }} />
            <View style={s.secured}>
              <Icon name="lock" size={14} color="#85858F" />
              <Text style={s.fine}>Secured by Dynamic. Vanna never holds your keys.</Text>
            </View>
          </>
        )}

        {step === "other" && connected && (
          <>
            <View style={s.done}>
              <WalletLogo logo={connected.logo} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={s.pillT}>{connected.app} connected</Text>
                <Text style={s.sheetS}>{CHAIN_LABEL[connected.chain]} {connected.addr}</Text>
              </View>
              <Icon name="check_circle" size={22} color="#32EEE2" filled />
            </View>
            <Text style={s.h}>Add a {CHAIN_LABEL[other(connected.chain)]} wallet too?</Text>
            <View style={{ gap: 12 }}>
              <View style={s.point}>
                <Icon name="swap_horiz" size={18} color={LK} />
                <Text style={[s.sub, { flex: 1 }]}>Connect both now so switching chains never stops you.</Text>
              </View>
              <View style={s.point}>
                <Icon name="schedule" size={18} color={LK} />
                <Text style={[s.sub, { flex: 1 }]}>You can also do it later from Account.</Text>
              </View>
            </View>
            <View style={s.field}>
              <TextInput value={email} onChangeText={setEmail} placeholder={`Email for ${CHAIN_LABEL[other(connected.chain)]}`} placeholderTextColor={MU} keyboardType="email-address" autoCapitalize="none" style={s.input} accessibilityLabel="Email address" />
              <Pressable
                onPress={() => {
                  setEmailFor(other(connected.chain));
                  sendCode();
                }}
                style={s.go}
                accessibilityRole="button"
                accessibilityLabel="Use email"
              >
                <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                <View><Icon name="arrow_forward" size={20} color="#FFFFFF" /></View>
              </Pressable>
            </View>
            <View style={s.or}>
              <View style={s.orLine} />
              <Text style={s.orT}>OR</Text>
              <View style={s.orLine} />
            </View>
            {wallets(other(connected.chain))}
            <View style={{ flex: 1, minHeight: 16 }} />
            <Pressable
              onPress={() => {
                markAskedOther();
                setStep("name");
              }}
              style={s.quiet}
              accessibilityRole="button"
            >
              <Text style={[s.ctaT, { color: LK }]}>Skip for now</Text>
            </Pressable>
          </>
        )}

        {step === "name" && (
          <>
            <Text style={[s.h, { marginTop: 12 }]}>Pick a display name</Text>
            <Text style={s.sub}>Shown on the leaderboard. You can change it once a season.</Text>
            <View style={[s.field, { paddingRight: 18 }]}>
              <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={MU} maxLength={20} style={s.input} accessibilityLabel="Display name" />
            </View>
            <View style={{ flex: 1, minHeight: 24 }} />
            <Pressable
              onPress={() => {
                if (name.trim()) setRewards({ name: name.trim() });
                finish();
              }}
              style={s.cta}
              accessibilityRole="button"
            >
              <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
              <Text style={s.ctaT}>Open Vanna</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  body: { flexGrow: 1, paddingHorizontal: 22, gap: 22 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: SF, alignItems: "center", justifyContent: "center" },
  h: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 26, lineHeight: 32, marginTop: 6 },
  sub: { color: MU, fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  point: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  field: { flexDirection: "row", alignItems: "center", height: 54, borderRadius: 27, borderWidth: 1, borderColor: BC, backgroundColor: SF, paddingLeft: 18, paddingRight: 6 },
  input: { flex: 1, minWidth: 0, color: "#FFFFFF", fontFamily: font.regular, fontSize: 16, height: "100%" },
  go: { width: 42, height: 42, borderRadius: 21, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  pill: { flex: 1, height: 50, borderRadius: 25, borderWidth: 1, borderColor: BC, backgroundColor: SF, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  pillT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 15 },
  or: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  orLine: { flex: 1, height: 1, backgroundColor: "#2A2A2E" },
  orT: { color: MU, fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.8 },
  seg: { flexDirection: "row", backgroundColor: SF, borderRadius: 20, padding: 3 },
  segI: { flex: 1, height: 36, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  segT: { fontFamily: font.semibold, fontSize: 13 },
  grid: { flexDirection: "row", gap: 8 },
  tile: { flex: 1, alignItems: "center", gap: 10, paddingVertical: 18, borderRadius: 16, backgroundColor: SF },
  tileT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 12 },
  soon: { position: "absolute", top: 6, right: 6, backgroundColor: "#2F1B61", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  soonT: { color: "#E1D5FA", fontFamily: font.semibold, fontSize: 9, letterSpacing: 0.4 },
  fine: { color: "#85858F", fontFamily: font.regular, fontSize: 12, lineHeight: 17, textAlign: "center" },
  lockup: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  emailT: { flexShrink: 1, color: "#FFFFFF", fontFamily: font.semibold, fontSize: 15, lineHeight: 21 },
  linkT: { color: LK, fontFamily: font.semibold, fontSize: 14, lineHeight: 20 },
  codeFoot: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 22, marginTop: -8 },
  footT: { flexShrink: 1, color: MU, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  secured: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  done: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: "#0F2A2B", marginTop: 8 },
  cta: { height: 54, borderRadius: 27, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  ctaT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16 },
  quiet: { height: 48, alignItems: "center", justifyContent: "center" },
  sheetT: { fontFamily: font.semibold, fontSize: 18, color: "#FFFFFF" },
  sheetS: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: MU },
  note: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: "#1E1A2E" },
});
