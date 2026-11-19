import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { ModuleHeader } from "@/components/module-header";
import { Icon } from "@/components/ui/icon";
import { IconAction } from "@/components/ui/kit";
import { hfFmt, nf, usd } from "@/format";
import { MascotFace } from "@/mascot/mascot";
import { DATA } from "@/sample/data";
import { hasMargin, hfWord, portfolioTotals, priceOf } from "@/sample/model";
import { useChain } from "@/state/chain";
import { useAccountRead } from "@/chain/account-live";
import { usePersonal } from "@/state/personal";
import { useTheme } from "@/theme/use-theme";
import { families, font } from "@/theme/tokens";
import { openSheet } from "@/ui/overlay";
import { openDeposit, openTransfer, openWithdraw } from "@/screens/move/move";

// Compact Portfolio hero (portfolio.js heroOf): Net worth, the one health factor with the chameleon face, Deposit / Withdraw /
// Transfer, then Wallet / Lending / Margin equity.
export function PortfolioHero() {
  const { chain } = useChain();
  // "—" until the first account read for this wallet has finished (never a misleading $0.00)
  const personal = usePersonal(chain);
  const read = useAccountRead(chain);
  const ready = personal && read === "ready";
  const T = portfolioTotals(chain);
  const margin = ready && hasMargin(DATA[chain]);

  return (
    <ModuleHeader fam={families.portfolio}>
      <View style={styles.hero}>
        <View>
          <View style={styles.lr}>
            <Text style={styles.label}>Net worth</Text>
          </View>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {ready ? usd(T.net) : "—"}
          </Text>
          {margin && <HeroHealth hf={T.a.hf} />}
          <View style={styles.actions}>
            <IconAction icon="south" label="Deposit" tone="hero" onPress={() => openDeposit(chain)} />
            <IconAction icon="north" label="Withdraw" tone="hero" onPress={() => openWithdraw(chain)} />
            <IconAction icon="swap_horiz" label="Transfer" tone="hero" onPress={openTransfer} />
          </View>
        </View>

        <View style={styles.stats}>
          <Pressable style={styles.stat} onPress={openWallet} accessibilityRole="button" accessibilityLabel={`Wallet ${usd(T.wallet)}, show tokens`}>
            <View style={styles.statLabelRow}>
              <Text style={styles.statLabel}>Wallet</Text>
              <Icon name="expand_more" size={14} color="#FFFFFF" />
            </View>
            <Text style={styles.statValue} numberOfLines={1}>{ready ? usd(T.wallet) : "—"}</Text>
          </Pressable>
          <View style={[styles.stat, styles.statSep]}>
            <Text style={styles.statLabel}>Lending</Text>
            <Text style={styles.statValue} numberOfLines={1}>{ready ? usd(T.lending) : "—"}</Text>
          </View>
          <View style={[styles.stat, styles.statSep]}>
            <Text style={styles.statLabel} numberOfLines={1}>Margin equity</Text>
            <Text style={styles.statValue} numberOfLines={1}>{margin ? usd(T.margin) : "—"}</Text>
          </View>
        </View>
      </View>
    </ModuleHeader>
  );
}

// The screen's one health factor: the face on the left looking at the number (none at or below 1.10).
function HeroHealth({ hf }: { hf: number }) {
  const live = isFinite(hf) && hf < 100;
  return (
    <Pressable
      style={styles.hf}
      onPress={() => router.navigate("/margin")}
      accessibilityRole="button"
      accessibilityLabel={live ? `Health factor ${hfFmt(hf)}, ${hfWord(hf)}. Open Margin` : "Health factor, no debt. Open Margin"}
    >
      {live && <MascotFace hf={hf} size={48} />}
      <View style={styles.hfText}>
        <Text style={styles.statLabel}>Health factor</Text>
        <Text style={styles.hfValue}>{live ? hfFmt(hf) : "No debt"}</Text>
      </View>
    </Pressable>
  );
}

function openWallet() {
  openSheet({ title: "Wallet", content: () => <WalletList /> });
}

function WalletList() {
  const { colors } = useTheme();
  const { chain } = useChain();
  const ready = usePersonal(chain);
  const rows = (ready ? Object.entries(DATA[chain].wallet) : []).map(([sym, amt]) => ({ sym, amt, value: amt * priceOf(sym) })).sort((a, b) => b.value - a.value);
  return (
    <>
      {!rows.length && <Text style={[sheetStyles.sub, { color: colors.muted }]}>—</Text>}
      {rows.map((r) => (
        <View key={r.sym} style={sheetStyles.row}>
          <TokenLogo sym={r.sym} size={36} />
          <View style={{ flex: 1, minWidth: 0, justifyContent: "center" }}>
            <Text style={[sheetStyles.title, { color: colors.text, flex: 0 }]} numberOfLines={1}>{r.sym}</Text>
            <Text style={[sheetStyles.sub, { color: colors.muted }]}>{nf(r.amt, 2)}</Text>
          </View>
          <Text style={[sheetStyles.title, { color: colors.text, flex: 0 }]}>{usd(r.value)}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  hero: { flex: 1, justifyContent: "space-between" },
  lr: { height: 22, justifyContent: "center" },
  label: { color: "rgba(255,255,255,0.98)", fontFamily: font.regular, fontSize: 14, lineHeight: 20 },
  value: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 34, lineHeight: 42, letterSpacing: -0.6, marginRight: 150, fontVariant: ["tabular-nums"] },
  hf: { position: "absolute", top: 2, right: 0, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  hfText: { alignItems: "flex-start", gap: 0 },
  hfValue: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 26, lineHeight: 32, fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, height: 40, marginTop: 4 },
  stats: { flexDirection: "row", paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.26)" },
  stat: { flex: 1, minWidth: 0, gap: 2 },
  statSep: { paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.28)" },
  statLabelRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  statLabel: { color: "rgba(255,255,255,0.96)", fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  statValue: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16, lineHeight: 22, fontVariant: ["tabular-nums"] },
});

const sheetStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 4 },
  title: { flex: 1, fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  sub: { fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
});
