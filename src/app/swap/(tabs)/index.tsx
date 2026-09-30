import { ArrowsLeftRight, Gear, Wallet } from "phosphor-react-native";
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";

import { RouteChip } from "@/components/swap/route-chip";
import { RoutePickerSheet } from "@/components/swap/route-picker-sheet";
import { SwapDetailsCard } from "@/components/swap/swap-details-card";
import { SwapFlipButton } from "@/components/swap/swap-flip-button";
import { SwapSettingsSheet } from "@/components/swap/swap-settings-sheet";
import { SwapTokenCard } from "@/components/swap/swap-token-card";
import { TokenPickerSheet } from "@/components/swap/token-picker-sheet";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { formatUsd } from "@/format/format-amount";
import { formatSwapAmount } from "@/format/format-swap-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useSwap } from "@/hooks/use-swap";
import { useTheme } from "@/theme/use-theme";
import type { SwapIssue } from "@/types/swap";

type OpenSheet = "route" | "settings" | "from" | "to" | null;

const QUICK_FILLS = [
  { label: "25%", fraction: 0.25 },
  { label: "50%", fraction: 0.5 },
  { label: "Max", fraction: 1 },
] as const;

function ctaLabel(issue: SwapIssue | null, symbol: string) {
  if (issue === "no-amount") return "Enter an amount";
  if (issue === "insufficient-balance") return `Not enough ${symbol}`;
  return "Swap · approve in wallet";
}

export default function SwapScreen() {
  const { spacing } = useTheme();
  const header = useHeaderProps();
  const { swap, setAmountText, pickFrom, pickTo, flip, fill, selectRoute, saveSettings, flow } = useSwap();
  const [sheet, setSheet] = useState<OpenSheet>(null);
  const closeSheet = () => setSheet(null);

  return (
    <>
      <Screen header={<ProductHeader product="swap" title="Swap" icon={ArrowsLeftRight} onBack={() => router.back()} {...header} />}>
        <ResourceView resource={swap} emptyLabel="No tokens available">
          {({ from, to, amountText, quote, issue, settings, route, tokens, routes, autoSlippageBps }) => (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <RouteChip label={route.label} open={sheet === "route"} onPress={() => setSheet("route")} />
                <IconButton icon={Gear} label="Swap settings" tone="outline" onPress={() => setSheet("settings")} />
              </View>

              <View>
                <SwapTokenCard
                  label="You pay · Wallet"
                  balance={`Balance ${formatSwapAmount(from.balance, from.decimals, from.symbol)}`}
                  symbol={from.symbol}
                  onPressToken={() => setSheet("from")}
                  value={amountText}
                  onChangeText={setAmountText}
                  usdValue={`≈ ${formatUsd(quote?.payValueUsd ?? 0n)}`}
                  quickFills={QUICK_FILLS}
                  onQuickFill={fill}
                  error={issue === "insufficient-balance" ? `Not enough ${from.symbol} in your wallet.` : undefined}
                />
                <SwapFlipButton onPress={flip} />
                <SwapTokenCard
                  label="You receive · Wallet"
                  balance={`Balance ${formatSwapAmount(to.balance, to.decimals, to.symbol)}`}
                  symbol={to.symbol}
                  onPressToken={() => setSheet("to")}
                  value={quote ? formatSwapAmount(quote.amountOut, to.decimals, to.symbol) : ""}
                  usdValue={`≈ ${formatUsd(quote?.receiveValueUsd ?? 0n)}`}
                />
              </View>

              <SwapDetailsCard quote={quote} receive={to} autoSlippage={settings.mode === "auto"} />

              <View style={{ marginTop: spacing.xs }}>
                <Button label={ctaLabel(issue, from.symbol)} icon={Wallet} disabled={issue !== null} onPress={flow.start} />
              </View>

              <RoutePickerSheet visible={sheet === "route"} routes={routes} selected={route.id} onSelect={selectRoute} onDismiss={closeSheet} />
              <SwapSettingsSheet
                visible={sheet === "settings"}
                settings={settings}
                autoSlippageBps={autoSlippageBps}
                onSave={saveSettings}
                onDismiss={closeSheet}
              />
              <TokenPickerSheet visible={sheet === "from"} tokens={tokens} selected={from.symbol} onSelect={pickFrom} onDismiss={closeSheet} />
              <TokenPickerSheet visible={sheet === "to"} tokens={tokens} selected={to.symbol} onSelect={pickTo} onDismiss={closeSheet} />
            </>
          )}
        </ResourceView>
      </Screen>
      <TransactionSheet state={flow.state} onPrimary={flow.primary} onClose={flow.close} />
    </>
  );
}
