import { type Href, router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { connectAndAddWallet } from "@/chain/connect-wallet";
import { Icon } from "@/components/ui/icon";
import { Card } from "@/components/ui/kit";
import { WalletLogo } from "@/components/wallet-logo";
import { CHAIN_LABEL, type Chain } from "@/state/chain";
import { canAddWallet, MAX_WALLETS, removeWallet, setWalletInUse, useWallets, walletState } from "@/state/wallets";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { haptic } from "@/ui/haptics";
import { closeSheet, openSheet, toast } from "@/ui/overlay";

// Add one more wallet (Account > Wallets > Add): Android's own wallet chooser opens straight away and lists what is installed.
export const openAddWallet = (c: Chain = "solana") => {
  if (!canAddWallet(c)) {
    toast(`You can keep ${MAX_WALLETS} wallets. Remove one first`, "err");
    return;
  }
  closeSheet();
  setTimeout(async () => {
    const w = await connectAndAddWallet();
    if (w) toast(`${w.app} added`);
  }, 200);
};

// Account > Wallets: every kept wallet; tap one to make it the one in use (no approval). Long-press removes it. Add opens the chooser.
export function WalletsCard({ sheet }: { sheet?: boolean } = {}) {
  const { colors } = useTheme();
  const st = useWallets();
  const c: Chain = "solana";
  // In the sheet the sheet's own title says "Wallets", and the wallets sit straight on the sheet.
  const Wrap = (sheet ? View : Card) as typeof View;
  return (
    <Wrap style={{ gap: 4, ...(sheet ? { paddingBottom: 8 } : null) }}>
      {!sheet && (
        <View style={styles.head}>
          <Text style={[styles.h, { color: colors.text, flex: 1 }]}>Wallets</Text>
        </View>
      )}
      <View style={{ paddingTop: 6 }}>
        {st.wallets[c].map((w) => {
          const on = st.inUse[c] === w.id;
          return (
            <Pressable
              key={w.id}
              onPress={() => {
                if (on) return;
                setWalletInUse(c, w.id);
                haptic.tick();
                toast(`${w.app} is now in use`);
              }}
              onLongPress={() =>
                openSheet({
                  title: `Remove ${w.app}?`,
                  content: (close) => (
                    <View style={{ gap: 12, paddingBottom: 8 }}>
                      <Text style={[styles.p, { color: colors.muted }]}>Vanna forgets this connection ({w.addr}). Your funds stay in {w.app}; you can add it again any time.</Text>
                      <Pressable
                        onPress={() => {
                          const next = walletState().wallets[c].find((x) => x.id !== w.id);
                          removeWallet(c, w.id);
                          close();
                          if (!next) {
                            router.replace("/welcome" as Href);
                            return;
                          }
                          toast(`${next.app} is now in use`);
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
              <WalletLogo logo={w.logo} icon={w.icon} size={34} />
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
            <Text style={[styles.t14, { color: colors.link }]}>{st.wallets[c].length === 0 ? "Connect a wallet" : "Add another wallet"}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.t12, { color: colors.muted, paddingVertical: 8 }]}>You can keep {MAX_WALLETS} wallets. To add another, press and hold one to remove it.</Text>
        )}
      </View>
      <Text style={[styles.t12, { color: colors.muted, marginTop: 4 }]}>One wallet is in use. Switching doesn&apos;t ask again; every transaction is approved in the wallet in use.</Text>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  h: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  p: { fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  wrow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58 },
  use: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  radio: { width: 22, height: 22, borderRadius: 11 },
  add: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 },
  pill: { height: 50, borderRadius: 25, borderWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  quiet: { height: 44, alignItems: "center", justifyContent: "center" },
  t10: { fontFamily: font.semibold, fontSize: 11 },
  t12: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  t14: { fontFamily: font.semibold, fontSize: 14 },
  t15: { fontFamily: font.semibold, fontSize: 15 },
});
