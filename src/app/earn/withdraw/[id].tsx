import { router, useLocalSearchParams } from "expo-router";

import { EarnAmountScreen } from "@/components/earn/earn-amount-screen";
import { EarnUnavailable } from "@/components/earn/earn-unavailable";
import { presentAmountForm } from "@/components/earn/present-amount-form";
import { useEarnForm } from "@/hooks/use-earn-form";

export default function WithdrawRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mode, setMode, market, input, quote, flow } = useEarnForm(id, "withdraw");

  if (market.status !== "ready" || !quote) {
    return <EarnUnavailable title="Vault" resource={market} emptyLabel="Vault not found" onBack={() => router.back()} />;
  }

  return (
    <EarnAmountScreen
      view={presentAmountForm(mode, market.data, quote, input.problem)}
      symbol={market.data.symbol}
      value={input.text}
      fills={input.fills}
      onChangeText={input.onChangeText}
      onQuickFill={input.fill}
      onModeChange={setMode}
      onSubmit={flow.start}
      onBack={() => router.back()}
      transaction={flow.state}
      onTransactionPrimary={flow.primary}
      onTransactionClose={flow.close}
      onViewPositions={() => router.replace("/earn/positions")}
    />
  );
}
