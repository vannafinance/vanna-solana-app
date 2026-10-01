import { ArrowsLeftRight, HandCoins, Plant, TrendUp } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";

import { VaultRow } from "@/components/earn/vault-row";
import { ProductTile } from "@/components/home/product-tile";
import { LeverageSelector } from "@/components/perps/leverage-selector";
import { MarketRow } from "@/components/perps/market-row";
import { PositionCard } from "@/components/perps/position-card";
import { AmountField } from "@/components/ui/amount-field";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Snackbar } from "@/components/ui/snackbar";
import { DetailRow } from "@/components/ui/detail-row";
import { HeroStat } from "@/components/ui/hero-stat";
import { ProductHeader } from "@/components/ui/product-header";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TokenIcon } from "@/components/ui/token-icon";
import { TokenPill } from "@/components/ui/token-pill";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { VannaWordmark } from "@/components/ui/vanna-wordmark";
import { useTheme } from "@/theme/use-theme";
import type { TransactionState } from "@/types/transaction";

const noop = () => undefined;

const sheets: Record<string, TransactionState> = {
  signing: { phase: "signing", step: 1, steps: 1, wallet: "Backpack" },
  confirming: { phase: "confirming", title: "Confirming", message: "Waiting for Solana to confirm." },
  success: { phase: "success", title: "Your long is open", message: "4.2422 TSLAx long at $353.59 · 3x · liq. $259.30" },
  network: { phase: "failure", kind: "network", title: "Network error", message: "Solana did not confirm this in time. Nothing left your wallet. Check your connection and try again." },
  rejected: { phase: "failure", kind: "rejected", title: "Request cancelled", message: "You cancelled the request in your wallet. Nothing was sent." },
};

export default function ComponentPreview() {
  const { colors, spacing } = useTheme();
  const [amount, setAmount] = useState("500.00");
  const [leverage, setLeverage] = useState(3);
  const [tab, setTab] = useState<"earn" | "perps">("earn");
  const [pool, setPool] = useState("usdc");
  const [note, setNote] = useState<string | null>(null);
  const [filter, setFilter] = useState(true);
  const [sheet, setSheet] = useState<keyof typeof sheets | null>(null);

  return (
    <>
      <Screen
        header={
          <ProductHeader
            product="home"
            brand={<VannaWordmark color={colors.onHero} />}
            notificationCount={3}
            onNotifications={noop}
            avatar={<TokenIcon symbol="SOL" size={40} />}
            onAvatar={noop}
          >
            <View style={{ flexDirection: "row", gap: spacing.xl, marginTop: spacing.lg }}>
              <HeroStat size="large" label="Wallet balance" value="$4,812.40" />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.xl, marginTop: spacing.lg }}>
              <HeroStat label="Net available" value="$4,320.37" />
              <HeroStat label="Net earnings" value="+$1.37" positive />
            </View>
          </ProductHeader>
        }
      >
        <AppText variant="heading">Component preview</AppText>
        <AppText variant="body" color="textMuted">
          Every design-system piece with placeholder props. Replaced by real screens as hooks land.
        </AppText>

        <View style={{ flexDirection: "row", gap: spacing.lg }}>
          <ProductTile product="perps" title="Perps" tagline="Long or short up to 5x" icon={TrendUp} onPress={noop} />
          <ProductTile product="swap" title="Swap" tagline="Any token, in seconds" icon={ArrowsLeftRight} onPress={noop} />
        </View>
        <View style={{ flexDirection: "row", gap: spacing.lg }}>
          <ProductTile product="earn" title="Earn" tagline="Lend, withdraw anytime" icon={HandCoins} onPress={noop} />
          <ProductTile product="farm" title="Farm" tagline="Yield in one click" icon={Plant} onPress={noop} />
        </View>

        <SegmentedControl
          value={tab}
          onChange={setTab}
          segments={[
            { value: "earn", label: "Current", badge: "2" },
            { value: "perps", label: "History", badge: "3" },
          ]}
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <DropdownMenu
            accessibilityLabel="Pool"
            label={pool === "usdc" ? "USDC vault" : "SOL vault"}
            value={pool}
            onSelect={setPool}
            options={[
              { value: "usdc", label: "USDC vault", detail: "Vanna lending pool" },
              { value: "sol", label: "SOL vault", detail: "Soon", badge: "Soon", disabled: true },
            ]}
          />
          <Chip label="Perps" check selected={filter} onPress={() => setFilter(!filter)} />
          <Chip label="Message" onPress={() => setNote("Settings saved")} />
        </View>

        <Card>
          <MarketRow symbol="TSLAx" pair="TSLAx-USDC" detail="Borrow 4.77% · Liquidity $24.0K" price="$353.59" watched onPress={noop} />
          <VaultRow symbol="USDC" supplied="$55.0K" borrowed="$2.8K" apy="0.03%" yourSupply="2,500" onPress={noop} />
        </Card>

        <Card>
          <AmountField
            label="Collateral"
            caption="Available $4,320.37"
            value={amount}
            onChangeText={setAmount}
            tokenSlot={<TokenPill symbol="USDC" />}
            quickFills={[
              { label: "25%", fraction: 0.25 },
              { label: "50%", fraction: 0.5 },
              { label: "75%", fraction: 0.75 },
              { label: "Max", fraction: 1 },
            ]}
            onQuickFill={noop}
          />
        </Card>

        <LeverageSelector options={[1, 2, 3, 4, 5]} value={leverage} onChange={setLeverage} summary={`${leverage}x`} />

        <Card>
          <DetailRow label="Entry price" value="$353.59" />
          <DetailRow label="Liquidation price" value="$259.30" />
          <DetailRow label="Fees" value="$0.45" last />
        </Card>

        <PositionCard
          symbol="TSLAx"
          pair="TSLAx-USDC"
          side="long"
          leverage={3}
          openedOn="Sep 22"
          pnl="+$152.52"
          pnlPercent="+10.89%"
          pnlPositive
          size="$4,352.69"
          sizeInToken="12.31 TSLAx"
          collateral="$1,400.00"
          collateralToken="USDC"
          liquidationPrice="$250.20"
          liquidationDistance="29.2% away"
          entryPrice="$341.20"
          markPrice="$353.59"
          onAddCollateral={noop}
          onClose={noop}
        />

        <View style={{ gap: spacing.sm }}>
          <Button label="Open long · approve in wallet" onPress={() => setSheet("signing")} />
          <Button label="Not enough margin available" disabled onPress={noop} />
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button flex size="md" variant="outline" label="Confirming" onPress={() => setSheet("confirming")} />
            <Button flex size="md" variant="outline" label="Success" onPress={() => setSheet("success")} />
          </View>
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Button flex size="md" variant="outline" label="Network" onPress={() => setSheet("network")} />
            <Button flex size="md" variant="outline" label="Rejected" onPress={() => setSheet("rejected")} />
          </View>
        </View>
      </Screen>
      <Snackbar message={note} onDismiss={() => setNote(null)} />
      <TransactionSheet state={sheet ? sheets[sheet] : null} onPrimary={() => setSheet(null)} onClose={() => setSheet(null)} />
    </>
  );
}
