import { useState } from "react";
import { View } from "react-native";

import { RouteMenu } from "@/components/swap/route-menu";
import { SwapDetailsCard } from "@/components/swap/swap-details-card";
import { SwapFlipButton } from "@/components/swap/swap-flip-button";
import { SwapSettingsSheet } from "@/components/swap/swap-settings-sheet";
import { SwapTokenCard } from "@/components/swap/swap-token-card";
import { TokenMenu } from "@/components/swap/token-menu";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { formatUsd } from "@/format/format-amount";
import { formatSwapAmount } from "@/format/format-swap-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useSwap } from "@/hooks/use-swap";
import type { SwapIssue } from "@/types/swap";

const QUICK_FILLS = [
  { label: "25%", fraction: 0.25 },
  { label: "50%", fraction: 0.5 },
  { label: "Max", fraction: 1 },
] as const;

function ctaLabel(issue: SwapIssue | null, symbol: string) {
  if (issue === "no-amount") return "Enter an amount";
  if (issue === "insufficient-balance") return `Not enough ${symbol}`;
  if (issue === "quoting") return "Finding the best price";
  if (issue === "no-route") return "No route for this pair";
  if (issue === "quote-failed") return "Price unavailable, try again";
  return "Swap · approve in wallet";
}

export default function SwapScreen() {
  const header = useHeaderProps();
  const { swap, setAmountText, pickFrom, pickTo, flip, fill, selectRoute, saveSettings, flow, onSheetPrimary } = useSwap();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Screen gap={12} paddingTop={12} header={<SpaceHeader space="trade" {...header} />}>
        <ResourceView resource={swap} emptyLabel="No tokens available">
          {({ from, to, amountText, quote, issue, settings, route, tokens, routes, autoSlippageBps }) => (
            <>
              <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <RouteMenu routes={routes} selected={route} onSelect={selectRoute} />
                <IconButton icon="settings" label="Swap settings" tone="outline" size={40} onPress={() => setSettingsOpen(true)} />
              </View>

              <View>
                <SwapTokenCard
                  label="You pay"
                  balance={`Balance ${formatSwapAmount(from.balance, from.decimals, from.symbol)}`}
                  tokenMenu={<TokenMenu tokens={tokens} selected={from} onSelect={pickFrom} />}
                  value={amountText}
                  onChangeText={setAmountText}
                  exceeds={issue === "insufficient-balance"}
                  usdValue={`≈ ${formatUsd(quote?.payValueUsd ?? 0n)}`}
                  quickFills={QUICK_FILLS}
                  onQuickFill={fill}
                />
                <SwapFlipButton onPress={flip} />
                <SwapTokenCard
                  label="You receive"
                  balance={`Balance ${formatSwapAmount(to.balance, to.decimals, to.symbol)}`}
                  tokenMenu={<TokenMenu tokens={tokens} selected={to} onSelect={pickTo} />}
                  value={quote ? formatSwapAmount(quote.amountOut, to.decimals, to.symbol) : ""}
                  usdValue={`≈ ${formatUsd(quote?.receiveValueUsd ?? 0n)}`}
                />
              </View>

              <SwapDetailsCard quote={quote} receive={to} autoSlippage={settings.mode === "auto"} />

              <Button label={ctaLabel(issue, from.symbol)} icon="account_balance_wallet" disabled={issue !== null} onPress={flow.start} />

              <SwapSettingsSheet
                visible={settingsOpen}
                settings={settings}
                autoSlippageBps={autoSlippageBps}
                onSave={saveSettings}
                onDismiss={() => setSettingsOpen(false)}
              />
            </>
          )}
        </ResourceView>
      </Screen>
      <TransactionSheet
        state={flow.state}
        onPrimary={onSheetPrimary}
        onClose={flow.close}
        primaryLabel={flow.done ? "View in swap history" : undefined}
      />
    </>
  );
}
