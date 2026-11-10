import { type Href, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CHAIN_LOGO, TokenLogo } from "@/components/brand";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/kit";
import { WalletLogo } from "@/components/wallet-logo";
import { CHAIN_LABEL, type Chain } from "@/state/chain";
import { canAddWallet, MAX_WALLETS, removeWallet, setWalletInUse, useWallets, walletState, WALLET_APPS } from "@/state/wallets";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";
import { closeSheet, openSheet, toast } from "@/ui/overlay";

// Open sign-in for one chain's wallets (Account > Wallets > Add, or the no-wallet prompt).
export const openAddWallet = (c: Chain) => {
  if (!canAddWallet(c)) {
    toast(`You can keep ${MAX_WALLETS} ${CHAIN_LABEL[c]} wallets. Remove one first`, "err");
    return;
  }
  closeSheet();
  setTimeout(() => router.push({ pathname: "/sign-in", params: { add: c } } as unknown as Href), 200);
};

// Chain switch: instant when that chain already has a wallet (or nobody is signed in: sample data). Only when you're
// signed in and the chain has no wallet at all, a sheet offers that chain's wallets or email. Never asked again after.
export function switchChain(c: Chain, setChain: (c: Chain) => void) {
  const st = walletState();
  setChain(c);
  if (!st.signedIn || st.wallets[c].length > 0) return;
  openSheet({ title: "", content: () => <NoWallet chain={c} back={() => (closeSheet(), setChain(c === "solana" ? "stellar" : "solana"))} /> });
}

function NoWallet({ chain, back }: { chain: Chain; back: () => void }) {
  const { colors } = useTheme();
  const st = useWallets();
  const otherChain: Chain = chain === "solana" ? "stellar" : "solana";
  const using = st.wallets[otherChain].find((w) => w.id === st.inUse[otherChain]);
  return (
    <View style={{ gap: 14, paddingBottom: 8 }}>
      <Text style={[styles.h, { color: colors.text }]}>No {CHAIN_LABEL[chain]} wallet yet</Text>
      <Text style={[styles.p, { color: colors.muted }]}>
        {using ? `You're signed in with ${using.app} on ${CHAIN_LABEL[otherChain]}. ` : ""}Pick how to use {CHAIN_LABEL[chain]}. This only shows until you add one.
      </Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {WALLET_APPS[chain].map((w) => (
          <Pressable key={w.app} disabled={w.soon} onPress={() => openAddWallet(chain)} style={[styles.tile, { backgroundColor: colors.bg }, w.soon && { opacity: 0.5 }]} accessibilityRole="button">
            <WalletLogo logo={w.logo} size={40} />
            <Text style={[styles.t12, { color: colors.text }]}>{w.app}</Text>
            {w.soon && <Text style={[styles.t10, { color: colors.muted }]}>Soon</Text>}
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => openAddWallet(chain)} style={[styles.pill, { borderColor: colors.borderControl }]} accessibilityRole="button">
        <Icon name="mail" size={20} />
        <Text style={[styles.t15, { color: colors.text }]}>Use email for {CHAIN_LABEL[chain]}</Text>
      </Pressable>
      <Pressable onPress={back} style={styles.quiet} accessibilityRole="button">
        <Text style={[styles.t15, { color: colors.link }]}>Back to {CHAIN_LABEL[otherChain]}</Text>
      </Pressable>
    </View>
  );
}

// Account > Wallets: every kept wallet per chain; tap one to make it the one in use (no approval). Long-press or the
// menu removes it. Add opens that chain's wallets.
export function WalletsCard() {
  const { colors } = useTheme();
  const st = useWallets();
  return (
    <Card style={{ gap: 4 }}>
      <View style={styles.head}>
        <Text style={[styles.h, { color: colors.text, flex: 1 }]}>Wallets</Text>
        {st.email && <Text style={[styles.t12, { color: colors.muted }]}>{st.email}</Text>}
      </View>
      {(["solana", "stellar"] as Chain[]).map((c, ci) => (
        <View key={c} style={[{ paddingTop: 6 }, ci > 0 && { borderTopWidth: 1, borderTopColor: colors.divider, marginTop: 6 }]}>
          <View style={styles.chainRow}>
            <TokenLogo sym={CHAIN_LOGO[c]} size={20} />
            <Text style={[styles.t15, { color: colors.text }]}>{CHAIN_LABEL[c]}</Text>
          </View>
          {st.wallets[c].map((w) => {
            const on = st.inUse[c] === w.id;
            return (
              <Pressable
                key={w.id}
                onPress={() => {
                  if (on) return;
                  setWalletInUse(c, w.id);
                  haptic.tick();
                  toast(`${w.app} is now in use on ${CHAIN_LABEL[c]}`);
                }}
                onLongPress={() =>
                  openSheet({
                    title: `Remove ${w.app}?`,
                    content: (close) => (
                      <View style={{ gap: 12, paddingBottom: 8 }}>
                        <Text style={[styles.p, { color: colors.muted }]}>Vanna forgets this connection ({w.addr}). Your funds stay in {w.app}; you can add it again any time.</Text>
                        <Pressable
                          onPress={() => {
                            const other: Chain = c === "solana" ? "stellar" : "solana";
                            const next = walletState().wallets[c].find((x) => x.id !== w.id);
                            const otherLeft = walletState().wallets[other].length > 0;
                            removeWallet(c, w.id);
                            close();
                            if (!next && !otherLeft) {
                              router.replace("/welcome" as Href);
                              return;
                            }
                            toast(next ? `${next.app} is now in use on ${CHAIN_LABEL[c]}` : `${w.app} removed`);
                          }}
                          style={[styles.pill, { borderColor: colors.negative }]}
                          accessibilityRole="button"
                        >
                          <Text style={[styles.t15, { color: colors.negative }]}>Remove</Text>
                        </Pressable>
                        <Pressable onPress={close} style={styles.quiet} accessibilityRole="button">
                          <Text style={[styles.t15, { color: colors.text }]}>Keep</Text>
                        </Pressable>
                      </View>
                    ),
                  })
                }
                style={styles.wrow}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                accessibilityLabel={`${w.app} ${w.addr}${on ? ", in use" : ""}`}
              >
                <WalletLogo logo={w.logo} size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.t15, { color: colors.text }]}>{w.app}</Text>
                  <Text style={[styles.t12, { color: colors.muted }]}>{w.addr}</Text>
                </View>
                {on && (
                  <View style={[styles.use, { backgroundColor: colors.tealTint }]}>
                    <Text style={[styles.t10, { color: colors.onTealTint }]}>In use</Text>
                  </View>
                )}
                <View style={[styles.radio, { borderColor: on ? colors.link : colors.borderControl, borderWidth: on ? 7 : 2 }]} />
              </Pressable>
            );
          })}
          {st.wallets[c].length === 0 && <Text style={[styles.t12, { color: colors.muted, paddingVertical: 8 }]}>No {CHAIN_LABEL[c]} wallet yet.</Text>}
          {st.wallets[c].length < MAX_WALLETS ? (
            <Pressable onPress={() => openAddWallet(c)} style={styles.add} accessibilityRole="button">
              <Icon name="add" size={18} color={colors.link} />
              <Text style={[styles.t14, { color: colors.link }]}>Add a {CHAIN_LABEL[c]} wallet</Text>
            </Pressable>
          ) : (
            <Text style={[styles.t12, { color: colors.muted, paddingVertical: 8 }]}>You can keep {MAX_WALLETS} {CHAIN_LABEL[c]} wallets. To add another, press and hold one to remove it.</Text>
          )}
        </View>
      ))}
      <Text style={[styles.t12, { color: colors.muted, marginTop: 4 }]}>One wallet per chain is in use. Switching doesn&apos;t ask again; every transaction is approved in the wallet in use.</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  p: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  chainRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 32 },
  wrow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58 },
  use: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  radio: { width: 22, height: 22, borderRadius: 11 },
  add: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  tile: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 16 },
  pill: { height: 50, borderRadius: 25, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  quiet: { height: 44, alignItems: "center", justifyContent: "center" },
  t10: { fontFamily: font.semibold, fontSize: 11 },
  t12: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  t14: { fontFamily: font.semibold, fontSize: 14 },
  t15: { fontFamily: font.semibold, fontSize: 15 },
});
