import { LinearGradient } from "expo-linear-gradient";
import { type Href, router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { type ComponentRef, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CHAIN_LOGO, TokenLogo, VannaMark } from "@/components/brand";
import { Icon } from "@/components/ui/icon";
import { WalletLogo } from "@/components/wallet-logo";
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
  const codeRef = useRef<ComponentRef<typeof TextInput>>(null);

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
            <Text style={[s.sheetS, { flex: 1 }]}>Preview: in the development build {app} opens here and you approve the connection once. After that, switching to it needs no approval.</Text>
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
    openSheet({
      title: "",
      content: (close) => (
        <View style={{ gap: 14, paddingBottom: 8 }}>
          <Text style={s.sheetT}>Continue with {label}</Text>
          <Text style={s.sheetS}>Preview: in the development build {label} opens to sign in. Vanna gets your name and email only, and creates a Solana and a Stellar wallet for you.</Text>
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
    setStep("code");
    setTimeout(() => codeRef.current?.focus(), 300);
  };
  const codeDone = async (v: string) => {
    if (v.length < 6) return;
    // Dynamic verifies the code and returns this email's Solana and Stellar wallets; Expo Go accepts any 6 digits.
    let real: { solana?: string; stellar?: string } = {};
    if (dynamic.available) {
      try {
        const ses = await dynamic.verifyEmailCode(v);
        real = { solana: ses.solanaAddress, stellar: ses.stellarAddress };
      } catch (e) {
        haptic.error();
        setCode("");
        return toast((e as Error).message || "That code didn't work", "err");
      }
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
    if (step === "main") return router.back();
    if (step === "code") return setStep(emailFor ? "other" : "main");
    if (step === "other" || step === "name") return finish();
  };

  const wallets = (c: Chain) => (
    <View style={s.grid}>
      {WALLET_APPS[c].map((w) => (
        <Pressable
          key={w.app}
          disabled={w.soon}
          onPress={() => approveWallet(c, w.app, w.logo)}
          style={[s.tile, w.soon && { opacity: 0.5 }]}
          accessibilityRole="button"
          accessibilityLabel={w.soon ? `${w.app}, coming soon` : `Connect ${w.app}`}
        >
          {w.soon && (
            <View style={s.soon}>
              <Text style={s.soonT}>SOON</Text>
            </View>
          )}
          <WalletLogo logo={w.logo} size={40} />
          <Text style={s.tileT}>{w.app}</Text>
        </Pressable>
      ))}
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
                    <Icon name="arrow_forward" size={20} color="#FFFFFF" />
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
                    <Icon name="arrow_forward" size={20} color="#FFFFFF" />
                  </Pressable>
                </View>
              </>
            )}
            <View style={{ flex: 1, minHeight: 24 }} />
            <Text style={s.fine}>Email, Google and X give you a Solana and a Stellar wallet, secured by Dynamic. Vanna never holds your keys.</Text>
          </>
        )}

        {step === "code" && (
          <>
            <Text style={[s.h, { marginTop: 12 }]}>Enter the code</Text>
            <Text style={s.sub}>We sent 6 digits to {email.trim()}.{dynamic.available ? "" : " Preview: any 6 digits work."}</Text>
            <Pressable onPress={() => codeRef.current?.focus()} style={s.codeRow} accessibilityRole="button" accessibilityLabel="Enter code">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={[s.codeBox, code.length === i && { borderColor: LK }]}>
                  <Text style={s.codeT}>{code[i] ?? ""}</Text>
                </View>
              ))}
            </Pressable>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(v) => {
                const d = v.replace(/\D/g, "").slice(0, 6);
                setCode(d);
                codeDone(d);
              }}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              style={s.hidden}
              accessibilityLabel="Six digit code"
            />
            <Pressable onPress={sendCode} hitSlop={8} accessibilityRole="button" style={{ alignSelf: "flex-start" }}>
              <Text style={[s.pillT, { color: LK }]}>Send a new code</Text>
            </Pressable>
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
                <Icon name="arrow_forward" size={20} color="#FFFFFF" />
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
  codeRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  codeBox: { flex: 1, height: 58, borderRadius: 14, borderWidth: 1.5, borderColor: BC, backgroundColor: SF, alignItems: "center", justifyContent: "center" },
  codeT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 22 },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
  done: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, backgroundColor: "#0F2A2B", marginTop: 8 },
  cta: { height: 54, borderRadius: 27, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  ctaT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16 },
  quiet: { height: 48, alignItems: "center", justifyContent: "center" },
  sheetT: { fontFamily: font.semibold, fontSize: 18, color: "#FFFFFF" },
  sheetS: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: MU },
  note: { flexDirection: "row", gap: 10, padding: 12, borderRadius: 12, backgroundColor: "#1E1A2E" },
});
