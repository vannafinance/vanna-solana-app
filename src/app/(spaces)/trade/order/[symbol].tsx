import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { CollateralCard } from "@/components/perps/collateral-card";
import { LeverageSelector } from "@/components/perps/leverage-selector";
import { OrderMarketCard } from "@/components/perps/order-market-card";
import { MarginEnvelope } from "@/components/margin/margin-envelope";
import { OrderSummary } from "@/components/perps/order-summary";
import { SideToggle } from "@/components/perps/side-toggle";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { ReviewSheet } from "@/components/ui/review-sheet";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { formatUsd } from "@/format/format-amount";
import { formatPrice } from "@/format/format-earn";
import { usePerpsOrder } from "@/hooks/use-perps-order";
import { CAUTION_HEALTH, LIQUIDATION_HEALTH } from "@/lib/perps/account-health";
import type { OrderIssue, Side } from "@/types/perps";

const QUICK_FILLS = [
  { label: "25%", fraction: 0.25 },
  { label: "50%", fraction: 0.5 },
  { label: "75%", fraction: 0.75 },
  { label: "Max", fraction: 1 },
] as const;

const sideName = (side: Side) => (side === "long" ? "Long" : "Short");
const otherSide = (side: Side): Side => (side === "long" ? "short" : "long");

function ctaLabel(side: Side, issue: OrderIssue, hasMarginAccount: boolean, symbol: string) {
  if (issue === "opposite-open") return `Close ${symbol} ${sideName(otherSide(side))} first`;
  if (issue === "empty") return "Enter an amount";
  if (issue === "insufficient-margin") return "Not enough margin available";
  if (issue === "health-low") return "Position too risky";
  return hasMarginAccount ? `Open ${side} · approve in wallet` : `Open account and ${side} · 2 approvals`;
}

export default function PerpsOrderScreen() {
  const params = useLocalSearchParams<{ symbol: string; side?: string }>();
  const order = usePerpsOrder(params.symbol, params.side === "short" ? "short" : "long");

  return (
    <>
      <ResourceView resource={order.ticket} emptyLabel="Market not found">
        {({ market, account, quote, issue }) => (
          <Screen
            gap={12}
            paddingTop={8}
            header={<PlainHeader title="Open position" onBack={router.back} />}
            footer={
              <View style={{ paddingTop: 4, paddingBottom: 8, gap: 10 }}>
                {issue === "opposite-open" ? (
                  <View accessibilityRole="alert" style={{ flexDirection: "row", gap: 8 }}>
                    <Icon name="info" size={16} color="warning" />
                    <AppText variant="caption" color="warning" style={{ flex: 1 }}>
                      {`Close your existing ${market.symbol} ${sideName(otherSide(order.side))} before opening a ${sideName(order.side)} on ${market.symbol}.`}
                    </AppText>
                  </View>
                ) : null}
                <Button
                  icon="account_balance_wallet"
                  variant={order.side === "long" ? "primary" : "danger"}
                  disabled={order.blocked}
                  label={ctaLabel(order.side, issue, order.hasMarginAccount, market.symbol)}
                  onPress={order.submit}
                />
              </View>
            }
          >
            <OrderMarketCard
              symbol={market.symbol}
              pair={market.pair}
              price={formatPrice(market.markPrice)}
              markets={order.markets}
              onSelect={(symbol) => router.setParams({ symbol })}
            />
            <SideToggle value={order.side} onChange={order.setSide} />
            <CollateralCard
              symbol={order.side === "long" ? "USDC" : market.symbol}
              note={order.collateralNote}
              caption={`Available ${formatUsd(account.available)}`}
              value={order.amountText}
              onChangeText={order.setAmountText}
              exceeds={issue === "insufficient-margin"}
              quickFills={QUICK_FILLS}
              onQuickFill={order.quickFill}
            />
            <LeverageSelector
              options={Array.from({ length: market.maxLeverage }, (_, index) => index + 1)}
              value={order.leverage}
              onChange={order.setLeverage}
            />
            <OrderSummary market={market} side={order.side} quote={quote} issue={issue} liquidationHealth={LIQUIDATION_HEALTH} cautionHealth={CAUTION_HEALTH} />
          </Screen>
        )}
      </ResourceView>
      <ReviewSheet data={order.review.data} onConfirm={order.review.confirm} onCancel={order.review.cancel} />
      <TransactionSheet
        state={order.flow.state}
        onPrimary={order.onSheetPrimary}
        onClose={order.closeFlow}
        onExplorer={order.flow.openExplorer}
        primaryLabel={order.flow.done ? "View position" : undefined}
        hero={order.envelope ? <MarginEnvelope address={order.envelope.address} stage={order.envelope.stage} /> : undefined}
      />
    </>
  );
}
