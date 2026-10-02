import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { CollateralCard } from "@/components/perps/collateral-card";
import { LeverageSelector } from "@/components/perps/leverage-selector";
import { OrderMarketCard } from "@/components/perps/order-market-card";
import { OrderSummary } from "@/components/perps/order-summary";
import { SideToggle } from "@/components/perps/side-toggle";
import { Button } from "@/components/ui/button";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { ReviewSheet } from "@/components/ui/review-sheet";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { formatUsd } from "@/format/format-amount";
import { usePerpsOrder } from "@/hooks/use-perps-order";
import { LIQUIDATION_HEALTH } from "@/lib/perps/account-health";
import type { OrderIssue, Side } from "@/types/perps";

const QUICK_FILLS = [
  { label: "25%", fraction: 0.25 },
  { label: "50%", fraction: 0.5 },
  { label: "75%", fraction: 0.75 },
  { label: "Max", fraction: 1 },
] as const;

function ctaLabel(side: Side, issue: OrderIssue, hasMarginAccount: boolean) {
  if (!hasMarginAccount) return "Create margin account";
  if (issue === "empty") return "Enter an amount";
  if (issue === "insufficient-margin") return "Not enough margin available";
  return `Open ${side} · approve in wallet`;
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
              <View style={{ paddingTop: 4, paddingBottom: 8 }}>
                <Button
                  icon="account_balance_wallet"
                  variant={order.side === "long" ? "primary" : "danger"}
                  disabled={order.blocked}
                  label={ctaLabel(order.side, issue, order.hasMarginAccount)}
                  onPress={order.submit}
                />
              </View>
            }
          >
            <OrderMarketCard symbol={market.symbol} pair={market.pair} />
            <SideToggle value={order.side} onChange={order.setSide} />
            <CollateralCard
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
            <OrderSummary market={market} side={order.side} quote={quote} issue={issue} liquidationHealth={LIQUIDATION_HEALTH} />
          </Screen>
        )}
      </ResourceView>
      <ReviewSheet data={order.review.data} onConfirm={order.review.confirm} onCancel={order.review.cancel} />
      <TransactionSheet
        state={order.flow.state}
        onPrimary={order.onSheetPrimary}
        onClose={order.flow.close}
        onExplorer={order.flow.openExplorer}
        primaryLabel={order.flow.done ? "View position" : undefined}
      />
    </>
  );
}
