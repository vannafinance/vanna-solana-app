import { formatToken } from "@/format/format-amount";
import { quoteSupply } from "@/lib/earn/quote";
import { previewMarket } from "@/lib/preview-data/earn";
import type { EarnMarket } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { previewResource } from "./preview-resource";
import { useEarnAmount } from "./use-earn-amount";
import { useTransactionFlow } from "./use-transaction-flow";

export function useSupply(id: string) {
  const found = previewMarket(id);
  const market: Resource<EarnMarket> = found ? previewResource(found) : { status: "empty" };
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
