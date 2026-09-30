import { formatToken } from "@/format/format-amount";
import { quoteWithdraw } from "@/lib/earn/quote";
import { previewMarket } from "@/lib/preview-data/earn";
import type { EarnMarket } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";
import { useEarnAmount } from "./use-earn-amount";
import { useTransactionFlow } from "./use-transaction-flow";

export function useWithdraw(id: string) {
  const found = previewMarket(id);
  const market: Resource<EarnMarket> = found ? previewResource(found) : { status: "empty" };
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
