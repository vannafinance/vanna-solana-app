import { formatToken } from "@/format/format-amount";
import { quoteSupply } from "@/lib/earn/quote";
import { useEarnAmount } from "./use-earn-amount";
import { useEarnMarket } from "./use-earn-market";
import { useTransactionFlow } from "./use-transaction-flow";

export function useSupply(id: string) {
  const market = useEarnMarket(id);
  const found = market.status === "ready" ? market.data : undefined;
  const input = useEarnAmount(found?.decimals ?? 0, found?.walletBalance.raw ?? 0n);
  const quote = found ? quoteSupply(found, input.amount) : null;

  const flow = useTransactionFlow({
    success: {
      title: "Supplied",
      message: `${formatToken({ raw: input.amount, decimals: found?.decimals ?? 0 }, 2)} ${found?.symbol ?? ""} is now earning in the ${found?.symbol ?? ""} vault`,
    },
  });

  return { market, input, quote, flow };
}
