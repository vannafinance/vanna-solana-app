import { router, useLocalSearchParams } from "expo-router";
import { Wallet } from "phosphor-react-native";

import { LeverageSelector } from "@/components/perps/leverage-selector";
import { OrderMarketCard } from "@/components/perps/order-market-card";
import { OrderSummary } from "@/components/perps/order-summary";
import { Button } from "@/components/ui/button";
import { AmountField } from "@/components/ui/amount-field";
import { Card } from "@/components/ui/card";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TokenPill } from "@/components/ui/token-pill";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { formatUsd } from "@/format/format-amount";
import { usePerpsOrder } from "@/hooks/use-perps-order";
import { LIQUIDATION_HEALTH } from "@/lib/perps/account-health";
import { useTheme } from "@/theme/use-theme";
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
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ symbol: string; side?: string }>();
  const order = usePerpsOrder(params.symbol, params.side === "short" ? "short" : "long");

  return (
    <>
      <ResourceView resource={order.ticket} emptyLabel="Market not found">
        {({ market, account, quote, issue }) => (
          <Screen
            header={<PlainHeader title="Open position" onBack={router.back} />}
            footer={
              <Button
                icon={Wallet}
                variant={order.side === "long" ? "primary" : "danger"}
                disabled={order.blocked}
                label={ctaLabel(order.side, issue, order.hasMarginAccount)}
                onPress={order.submit}
              />
            }
          >
            <OrderMarketCard symbol={market.symbol} pair={market.pair} price={formatUsd(market.markPrice)} />
            <SegmentedControl
              value={order.side}
              onChange={order.setSide}
              activeColor={order.side === "long" ? colors.primary : colors.negative}
              segments={[
                { value: "long", label: "Long" },
                { value: "short", label: "Short" },
              ]}
            />
            <Card>
              <AmountField
                label="Collateral"
                caption={`Available ${formatUsd(account.available)}`}
                value={order.amountText}
                onChangeText={order.setAmountText}
                tokenSlot={<TokenPill symbol="USDC" />}
                quickFills={QUICK_FILLS}
                onQuickFill={order.quickFill}
                error={issue === "insufficient-margin" ? `Only ${formatUsd(account.available)} is available in your margin account. Lower the amount.` : undefined}
              />
            </Card>
            <LeverageSelector
              options={Array.from({ length: market.maxLeverage }, (_, index) => index + 1)}
              value={order.leverage}
              onChange={order.setLeverage}
              summary={`${order.leverage}x · ${formatUsd(quote.size)} position`}
            />
            <OrderSummary market={market} side={order.side} quote={quote} issue={issue} liquidationHealth={LIQUIDATION_HEALTH} />
          </Screen>
        )}
      </ResourceView>
      <TransactionSheet
        state={order.flow.state}
        onPrimary={order.onSheetPrimary}
        onClose={order.flow.close}
        primaryLabel={order.flow.done ? "View position" : undefined}
      />
    </>
  );
}
