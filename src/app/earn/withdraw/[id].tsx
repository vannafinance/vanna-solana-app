import { router, useLocalSearchParams } from "expo-router";

import { EarnAmountScreen } from "@/components/earn/earn-amount-screen";
import { EarnUnavailable } from "@/components/earn/earn-unavailable";
import { presentAmountForm } from "@/components/earn/present-amount-form";
import { useWithdraw } from "@/hooks/use-withdraw";

export default function WithdrawScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { market, input, quote, flow } = useWithdraw(id);

  if (market.status !== "ready" || !quote) {
    return <EarnUnavailable title="Vault" resource={market} emptyLabel="Vault not found" onBack={() => router.back()} />;
  }

  return (
    <EarnAmountScreen
      view={presentAmountForm("withdraw", market.data, quote, input.problem)}
      symbol={market.data.symbol}
      value={input.text}
      onChangeText={input.onChangeText}
      onQuickFill={input.fill}
      onModeChange={(mode) => router.replace(`/earn/${mode}/${id}`)}
      onSubmit={flow.start}
      onBack={() => router.back()}
      transaction={flow.state}
      onTransactionPrimary={flow.primary}
      onTransactionClose={flow.close}
      onViewPositions={() => router.replace("/earn/positions")}
    />
  );
}
