import { formatToken } from "@/format/format-amount";
import { quoteWithdraw } from "@/lib/earn/quote";
import { useEarnAmount } from "./use-earn-amount";
import { useEarnMarket } from "./use-earn-market";
import { useTransactionFlow } from "./use-transaction-flow";

export function useWithdraw(id: string) {
  const market = useEarnMarket(id);
  const found = market.status === "ready" ? market.data : undefined;
  const input = useEarnAmount(found?.decimals ?? 0, found?.supplied.raw ?? 0n);
  const quote = found ? quoteWithdraw(found, input.amount) : null;

  const flow = useTransactionFlow({
    success: {
      title: "Withdrawn",
      message: `${formatToken({ raw: input.amount, decimals: found?.decimals ?? 0 }, 2)} ${found?.symbol ?? ""} is back in your wallet`,
    },
  });

  return { market, input, quote, flow };
}
