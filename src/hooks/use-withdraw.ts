import { formatToken } from "@/format/format-amount";
import { quoteWithdraw } from "@/lib/earn/quote";
import { buildEarnReview } from "@/lib/earn/review";
import { withdrawFromVault } from "@/lib/solana/earn-transactions";
import { TransactionError } from "@/types/transaction";

import { useConnectedWallet } from "./use-connected-wallet";
import { useClearAfterSuccess } from "./use-clear-after-success";
import { useEarnAmount } from "./use-earn-amount";
import { useEarnMarket } from "./use-earn-market";
import { useReviewStep } from "./use-review-step";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletSigner } from "./use-wallet-signer";

export function useWithdraw(id: string) {
  const market = useEarnMarket(id);
  const found = market.status === "ready" ? market.data : undefined;
  const input = useEarnAmount(found?.decimals ?? 0, found?.supplied.raw ?? 0n, found?.poolAvailable.raw);
  const quote = found ? quoteWithdraw(found, input.amount) : null;
  const signer = useWalletSigner();
  const wallet = useConnectedWallet();

  const flow = useTransactionFlow({
    run: (_step, progress) =>
      signer.execute(({ connection, owner, hooks }) => {
        if (found === undefined || input.amount === 0n) throw new TransactionError("network", "Something went wrong", "The withdrawal could not be prepared. Nothing left your wallet.");
        return withdrawFromVault(connection, owner, found.symbol, { amount: input.amount, supplied: found.supplied.raw, exchangeRate: found.shareExchangeRate }, hooks);
      }, progress),
    success: {
      title: "Withdrawn",
      message: `${formatToken({ raw: input.amount, decimals: found?.decimals ?? 0 }, 2)} ${found?.symbol ?? ""} is back in your wallet`,
    },
  });

  const review = useReviewStep(
    () => (found && quote && wallet && input.amount > 0n ? buildEarnReview({ mode: "withdraw", market: found, quote, amount: input.amount, wallet }) : null),
    flow.start,
  );

  useClearAfterSuccess(flow.done, input.clear);

  return { market, input, quote, flow, review };
}
