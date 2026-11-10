import { type Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { CHAIN_LOGO, TokenLogo, Wordmark } from "@/components/brand";
import { ScreenHeader } from "@/components/screen-header";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/components/ui/material-symbols";
import { Card, IconAction } from "@/components/ui/kit";
import { usd } from "@/format";
import { ACCOUNT, DATA, POINTS } from "@/sample/data";
import { initialOf } from "@/components/avatar";
import { useRewards } from "@/sample/rewards";
import { openEditName } from "@/screens/rewards/edit";
import { setConfirmTx, setLockEnabled, useBiometricLabel, useLock } from "@/state/lock";
import { haptic } from "@/ui/haptics";
import { hasMargin, walletUsd } from "@/sample/model";
import { type AppearanceMode, setAppearance, useAppearance } from "@/state/appearance";
import { type Chain, CHAIN_LABEL, useChain } from "@/state/chain";
import { switchChain, WalletsCard } from "@/screens/wallets/wallets";
import { usePersonal } from "@/state/personal";
import { signOut, useWallets, walletState } from "@/state/wallets";
import { useTheme } from "@/theme/use-theme";
import { BRAND_GRADIENT, font } from "@/theme/tokens";
import { openSheet, toast } from "@/ui/overlay";
import { AfterTransition } from "@/ui/ready";
import { openDeposit, openTransfer, openWithdraw } from "@/screens/move/move";

/* Account (design screens/account.js, compact = one scrolling page): profile, Rewards, Network, Wallets, Appearance,
   Notifications, Security, Help, Delete account, Sign out. Settings are stored locally; sign-in arrives with Dynamic. */
const MARGIN_ADDR: Record<Chain, string> = { solana: "AXir…V7y5", stellar: "CB4M…2KQD" };

export default function Account() {
  const { colors } = useTheme();
  const { chain, setChain } = useChain();
  const { signedIn } = useWallets();
  const mine = usePersonal(chain);
  const me = useRewards();
  const appearance = useAppearance();
  const [notif, setNotif] = useState({ health: true, trades: true, earn: true, rewards: false });
  const lock = useLock();
  const bioLabel = useBiometricLabel();
  const ios = Platform.OS === "ios";

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="auto" />
      <ScreenHeader title="Account" />
      <AfterTransition>
      <ScrollView contentContainerStyle={styles.body}>
        {/* profile (design .ac-pc): one row on the brand gradient; the avatar's badge is the chain in use */}
        <LinearGradient colors={["#FC5457", "#703AE6", "#2F1B61"]} locations={[0, 0.5, 1]} start={{ x: -0.2, y: -0.2 }} end={{ x: 1, y: 1.1 }} style={styles.pc}>
          <View style={styles.avWrap}>
            <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.av}>
              <Text style={styles.avText}>{initialOf(me.name)}</Text>
            </LinearGradient>
            <View style={styles.avBadge}>
              <TokenLogo sym={CHAIN_LOGO[chain]} size={16} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.pcName} numberOfLines={1}>{me.name}</Text>
            <Text style={styles.pcSub} numberOfLines={1}>{ACCOUNT.email}</Text>
            <View style={styles.tester}>
              <Text style={styles.testerText}>Copilot tester</Text>
            </View>
          </View>
          <View style={styles.pcActs}>
            <IconAction icon="south" label="Deposit" tone="hero" onPress={() => openDeposit(chain)} />
            <IconAction icon="north" label="Withdraw" tone="hero" onPress={() => openWithdraw(chain)} />
            <IconAction icon="swap_horiz" label="Transfer" tone="hero" onPress={openTransfer} />
          </View>
        </LinearGradient>

        <Card style={styles.list}>
          <NavRow icon="stars" iconColor="#FFB800" label="Rewards" value={`${POINTS.toLocaleString("en-US")} pts`} onPress={() => router.push("/rewards" as Href)} />
          <NavRow icon="badge" label="Display name" value={me.name} onPress={openEditName} />
        </Card>

        <Card>
          <Head>Network</Head>
          <View style={[styles.seg, { backgroundColor: colors.segment }]} accessibilityRole="tablist">
            {(["solana", "stellar"] as Chain[]).map((c) => {
              const on = c === chain;
              return (
                <Pressable
                  key={c}
                  onPress={() => {
                    if (!on) {
                      switchChain(c, setChain);
                      if (!signedIn || walletState().wallets[c].length) toast(`Switched to ${CHAIN_LABEL[c]}`);
                    }
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={[styles.segItem, on && { backgroundColor: colors.segmentActive }]}
                >
                  <TokenLogo sym={CHAIN_LOGO[c]} size={22} />
                  <Text style={{ fontFamily: font.semibold, fontSize: 14, color: on ? colors.text : colors.muted }}>{CHAIN_LABEL[c]}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ marginBottom: -8 }}>
            <NavRow icon="water_drop" label={`${CHAIN_LABEL[chain]} test faucet`} onPress={() => openDeposit(chain)} />
          </View>
        </Card>

        {signedIn && <WalletsCard />}
        <Card style={styles.list}>
          <Head>{signedIn ? "This chain" : "Wallets"}</Head>
          <InfoRow icon="login" label="Sign-in" value={ACCOUNT.email} after={ACCOUNT.verified ? <Icon name="verified" size={16} color={colors.positive} filled /> : undefined} />
          {(["solana", "stellar"] as Chain[]).map((c) => (
            <View key={c} style={styles.r}>
              <TokenLogo sym={CHAIN_LOGO[c]} size={20} />
              <Text style={[styles.rl, { color: colors.muted }]}>{CHAIN_LABEL[c]}</Text>
              <Text style={[styles.rv, { color: colors.text, fontFamily: font.regular }]}>{ACCOUNT.wallets[c].addr}</Text>
              <Pressable onPress={() => toast("Address copied")} accessibilityRole="button" accessibilityLabel={`Copy ${CHAIN_LABEL[c]} address`} hitSlop={8}>
                <Icon name="content_copy" size={18} color="muted" />
              </Pressable>
            </View>
          ))}
          <InfoRow icon="account_balance_wallet" label="Balance" value={mine ? usd(walletUsd(chain)) : "—"} />
          <NavRow icon="account_balance" label="Margin account" value={!mine ? "—" : hasMargin(DATA[chain]) ? MARGIN_ADDR[chain] : "Not created"} onPress={() => router.navigate("/margin")} />
        </Card>

        <Card style={styles.list}>
          <Head>Appearance</Head>
          {(
            [
              ["system", "System default"],
              ["light", "Light"],
              ["dark", "Dark"],
            ] as [AppearanceMode, string][]
          ).map(([v, l]) => (
            <Pressable key={v} onPress={() => setAppearance(v)} style={styles.r} accessibilityRole="radio" accessibilityState={{ checked: appearance === v }}>
              <View style={[styles.radio, { borderColor: appearance === v ? colors.link : colors.borderControl }]}>
                {appearance === v && <View style={[styles.radioIn, { backgroundColor: colors.link }]} />}
              </View>
              <Text style={[styles.rl, { color: colors.text, fontSize: 16 }]}>{l}</Text>
            </Pressable>
          ))}
        </Card>

        <Card style={styles.list}>
          <Head>Notifications</Head>
          <ToggleRow icon="monitor_heart" label="Health" value={notif.health} onChange={(v) => setNotif({ ...notif, health: v })} />
          <ToggleRow icon="candlestick_chart" label="Trades" value={notif.trades} onChange={(v) => setNotif({ ...notif, trades: v })} />
          <ToggleRow icon="savings" label={chain === "solana" ? "Earn and Predict" : "Earn"} value={notif.earn} onChange={(v) => setNotif({ ...notif, earn: v })} />
          <ToggleRow icon="stars" label="Points drop" value={notif.rewards} onChange={(v) => setNotif({ ...notif, rewards: v })} />
          <NavRow icon="notifications" label="All" onPress={() => router.push("/notifications")} />
        </Card>

        <Card style={styles.list}>
          <Head>Security</Head>
          {/* V7 Security: biometrics to confirm transactions (email wallet) and app lock; named after what the phone has set up */}
          <ToggleRow
            icon={bioLabel?.includes("Face") || (!bioLabel && ios) ? "face" : "fingerprint"}
            label={`${bioLabel ?? (ios ? "Face ID" : "Fingerprint")} for transactions`}
            value={lock.confirmTx}
            onChange={(v) => setConfirmTx(v).then((ok) => !ok && toast("Not turned on: couldn't confirm it's you", "err"))}
          />
          <ToggleRow icon="lock" label="App lock" value={lock.enabled} onChange={(v) => setLockEnabled(v).then((ok) => ok ? v && toast(`Vanna locks after 5 minutes away`) : toast("Not turned on: couldn't confirm it's you", "err"))} />
          <NavRow icon="key" label="Wallet key" value="Export" onPress={() => toast("Key export comes with the embedded wallet")} />
          <InfoRow icon="devices" label="This session" value="Installed app" />
        </Card>

        <Card style={styles.list}>
          <NavRow icon="menu_book" label="Docs" external onPress={() => WebBrowser.openBrowserAsync("https://docs.vanna.finance/home").catch(() => toast("Couldn't open the docs"))} />
          <InfoRow icon="support_agent" label="Support" value="" />
        </Card>

        <Card style={styles.list}>
          <NavRow icon="delete" label="Delete account" danger onPress={confirmDelete} />
        </Card>

        <Pressable
          style={[styles.out, { borderColor: colors.borderControl }]}
          onPress={() =>
            openSheet({
              title: "Sign out",
              content: (close) => (
                <View style={{ gap: 12, paddingBottom: 8 }}>
                  <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.muted }}>
                    This forgets every wallet on this phone and returns to the intro. Your funds stay in each wallet. To stop using only the one in use, long-press it under Wallets.
                  </Text>
                  <Pressable
                    onPress={() => {
                      signOut();
                      close();
                      router.replace("/welcome" as Href);
                    }}
                    style={[styles.out, { borderColor: colors.negative, justifyContent: "center" }]}
                    accessibilityRole="button"
                  >
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.negative }}>Sign out of all wallets</Text>
                  </Pressable>
                  <Pressable onPress={close} style={{ height: 44, alignItems: "center", justifyContent: "center" }} accessibilityRole="button">
                    <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>Stay signed in</Text>
                  </Pressable>
                </View>
              ),
            })
          }
          accessibilityRole="button"
        >
          <Icon name="logout" size={18} />
          <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.text }}>Sign out</Text>
        </Pressable>
        <View style={styles.ver}>
          <Wordmark height={10} color={colors.muted} />
          <Text style={{ fontFamily: font.regular, fontSize: 12, color: colors.muted }}>2.0.0</Text>
        </View>
      </ScrollView>
      </AfterTransition>
    </View>
  );
}

function confirmDelete() {
  openSheet({
    title: "Delete account",
    content: (close) => <DeleteBody close={close} />,
  });
}

// Delete account: what goes, what stays (with Withdraw first right there), and one press-and-hold button: hold 1.5 s to delete,
// let go to cancel. Simpler than a switch plus a button, and it can't be triggered by a stray tap.
const HOLD = 1500;
function DeleteBody({ close }: { close: () => void }) {
  const { colors } = useTheme();
  const { chain } = useChain();
  const me = useRewards();
  const left = walletUsd("solana") + walletUsd("stellar");
  const p = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  const start = () => {
    haptic.tap();
    p.value = withTiming(1, { duration: HOLD, easing: Easing.linear });
    timer.current = setTimeout(() => {
      haptic.success();
      close();
      router.replace("/portfolio" as Href);
      toast("Account deleted");
    }, HOLD);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    p.value = withTiming(0, { duration: 200 });
  };
  return (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      <View style={[styles.dcard, { backgroundColor: colors.pinkTint }]}>
        <Icon name="person_remove" size={22} color={colors.onPinkTint} />
        <Text style={[styles.dt, { color: colors.onPinkTint }]}>
          <Text style={{ fontFamily: font.semibold }}>Deleted for good:</Text> your sign-in, the name {me.name}, {POINTS.toLocaleString("en-US")} points and your referrals.
        </Text>
      </View>
      <View style={[styles.dcard, { backgroundColor: colors.bg }]}>
        <Icon name="account_balance_wallet" size={22} color="muted" />
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[styles.dt, { color: colors.text }]}>
            <Text style={{ fontFamily: font.semibold }}>{usd(left)}</Text> stays in your wallets. Vanna can&apos;t recover them after this.
          </Text>
          <Pressable onPress={() => (close(), setTimeout(() => openWithdraw(chain), 300))} hitSlop={8} accessibilityRole="button">
            <Text style={{ fontFamily: font.semibold, fontSize: 14, color: colors.link }}>Withdraw first</Text>
          </Pressable>
        </View>
      </View>
      <Pressable onPressIn={start} onPressOut={stop} style={[styles.hold, { borderColor: colors.negative }]} accessibilityRole="button" accessibilityLabel="Hold to delete account" accessibilityHint="Press and hold for a second and a half">
        <Animated.View style={[styles.holdFill, { backgroundColor: colors.negative }, fill]} />
        <Icon name="delete" size={20} color={colors.text} />
        <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>Hold to delete</Text>
      </Pressable>
      <Pressable onPress={close} style={styles.keep} accessibilityRole="button">
        <Text style={{ fontFamily: font.semibold, fontSize: 15, color: colors.text }}>Keep my account</Text>
      </Pressable>
    </View>
  );
}

function Head({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <Text style={[styles.head, { color: colors.text }]}>{children}</Text>;
}

function InfoRow({ icon, label, value, after }: { icon: IconName; label: string; value: string; after?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.r}>
      <Icon name={icon} size={20} color="muted" />
      <Text style={[styles.rl, { color: colors.muted }]}>{label}</Text>
      <Text style={[styles.rv, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      {after}
    </View>
  );
}

function NavRow({ icon, iconColor, label, value, onPress, external, danger }: { icon: IconName; iconColor?: string; label: string; value?: string; onPress: () => void; external?: boolean; danger?: boolean }) {
  const { colors } = useTheme();
  const c = danger ? colors.negative : colors.text;
  return (
    <Pressable onPress={onPress} style={styles.r} accessibilityRole={external ? "link" : "button"} android_ripple={{ color: colors.divider }}>
      <Icon name={icon} size={20} color={iconColor ?? (danger ? colors.negative : colors.muted)} filled={icon === "stars"} />
      <Text style={[styles.rl, { color: c, fontFamily: font.semibold }, value == null && { flex: 1 }]}>{label}</Text>
      {value != null && (
        <Text style={[styles.rv, { color: colors.muted, fontFamily: font.regular }]} numberOfLines={1}>
          {value}
        </Text>
      )}
      <Icon name={external ? "open_in_new" : "chevron_right"} size={external ? 18 : 20} color="muted" />
    </Pressable>
  );
}

function ToggleRow({ icon, label, value, onChange }: { icon: IconName; label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.r}>
      <Icon name={icon} size={20} color="muted" />
      <Text style={[styles.rl, { color: colors.text, flex: 1 }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
        trackColor={{ true: "#703AE6", false: colors.disabled }}
        thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dcard: { flexDirection: "row", gap: 12, padding: 14, borderRadius: 14, alignItems: "flex-start" },
  dt: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  hold: { height: 54, borderRadius: 27, borderWidth: 1.5, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  holdFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  keep: { height: 48, alignItems: "center", justifyContent: "center" },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  pc: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 20, paddingHorizontal: 16, borderRadius: 16 },
  avWrap: { width: 56, height: 56 },
  av: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFFFFF" },
  avBadge: { position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#FFFFFF", backgroundColor: "#FFFFFF", overflow: "hidden", alignItems: "center", justifyContent: "center" },
  tester: { alignSelf: "flex-start", minHeight: 20, paddingHorizontal: 8, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", marginTop: 2 },
  testerText: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 11, lineHeight: 20 },
  avText: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 22 },
  pcName: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16, lineHeight: 24 },
  pcSub: { color: "rgba(255,255,255,0.98)", fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  pcActs: { flexDirection: "row", gap: 6 },
  list: { paddingVertical: 8, gap: 0 },
  head: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22, paddingVertical: 8 },
  r: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 },
  rl: { fontFamily: font.regular, fontSize: 14, flexShrink: 0 },
  rv: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14 },
  seg: { flexDirection: "row", padding: 4, borderRadius: 12, gap: 4 },
  segItem: { flex: 1, height: 44, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioIn: { width: 10, height: 10, borderRadius: 5 },
  out: { height: 48, borderRadius: 24, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 },
  danger: { height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  ver: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
});
