import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { RouteMenu } from "@/components/swap/route-menu";
import { SwapDetailsCard } from "@/components/swap/swap-details-card";
import { SwapFlipButton } from "@/components/swap/swap-flip-button";
import { SwapHistoryList } from "@/components/swap/swap-history-list";
import { SwapSettingsSheet } from "@/components/swap/swap-settings-sheet";
import { SwapTokenCard } from "@/components/swap/swap-token-card";
import { TokenMenu } from "@/components/swap/token-menu";
import { WalletSource } from "@/components/swap/wallet-source";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { ReviewSheet } from "@/components/ui/review-sheet";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { formatUsd } from "@/format/format-amount";
import { formatSwapAmount } from "@/format/format-swap-amount";
import { useExplorer } from "@/hooks/use-explorer";
import { useSwap } from "@/hooks/use-swap";
import { useSwapHistory } from "@/hooks/use-swap-history";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { useTheme } from "@/theme/use-theme";
import type { SwapIssue } from "@/types/swap";

type SwapView = "swap" | "history";

const VIEWS: readonly { value: SwapView; label: string }[] = [
  { value: "swap", label: "Swap" },
  { value: "history", label: "History" },
];

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

function VolumeRow({ volume }: { volume: string }) {
  return (
    <View style={{ height: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <AppText variant="body" color="textMuted">
        Swapped in the last 30 days
      </AppText>
      <AppText variant="body" strong>
        {volume}
      </AppText>
    </View>
  );
}

// Swap is a wallet tool that sits outside the four modules: anyone can use it, and it never touches the margin account,
// where leverage lives. Its own history is here, not in Trade.
export default function SwapScreen() {
  const { spacing } = useTheme();
  const [view, setView] = useState<SwapView>("swap");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const wallet = useWalletAddress();
  const history = useSwapHistory();
  const { openTransaction } = useExplorer();
  const { swap, setAmountText, pickFrom, pickTo, flip, fill, selectRoute, saveSettings, flow, review, onSheetPrimary } = useSwap(() => setView("history"));

  const header = <PlainHeader title="Swap" onBack={() => router.back()} />;
  const top = (
    <>
      <WalletSource address={wallet} />
      <SegmentedControl segments={VIEWS} value={view} onChange={setView} variant="buttons" />
    </>
  );

  const page =
    view === "history" && history.status === "ready" ? (
      <SwapHistoryList
        header={
          <>
            {header}
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.md, gap: spacing.md }}>
              {top}
              <VolumeRow volume={formatUsd(history.data.volumeUsd)} />
            </View>
          </>
        }
        groups={history.data.groups}
        onOpenTransaction={openTransaction}
      />
    ) : (
      <Screen gap={12} paddingTop={spacing.xs} header={header}>
        {top}
        {view === "history" ? (
          <ResourceView resource={history} emptyLabel="No swaps yet">
            {() => null}
          </ResourceView>
        ) : (
          <ResourceView resource={swap} emptyLabel="No tokens available">
            {({ from, to, amountText, quote, issue, settings, route, tokens, routes, autoSlippageBps }) => (
              <>
                <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <RouteMenu routes={routes} selected={route} onSelect={selectRoute} />
                  <IconButton icon="settings" label="Swap settings" tone="outline" size={44} onPress={() => setSettingsOpen(true)} />
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

                <Button label={ctaLabel(issue, from.symbol)} icon="account_balance_wallet" disabled={issue !== null} onPress={review.request} />

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
        )}
      </Screen>
    );

  return (
    <>
      {page}
      <ReviewSheet data={review.data} onConfirm={review.confirm} onCancel={review.cancel} />
      <TransactionSheet
        state={flow.state}
        onPrimary={onSheetPrimary}
        onClose={flow.close}
        onExplorer={flow.openExplorer}
        primaryLabel={flow.done ? "View in swap history" : undefined}
      />
    </>
  );
}
