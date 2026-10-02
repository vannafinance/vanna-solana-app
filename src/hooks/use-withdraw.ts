import { formatToken } from "@/format/format-amount";
import { quoteWithdraw } from "@/lib/earn/quote";
import { withdrawFromVault } from "@/lib/solana/earn-transactions";
import { TransactionError } from "@/types/transaction";

import { useEarnAmount } from "./use-earn-amount";
import { useEarnMarket } from "./use-earn-market";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletSigner } from "./use-wallet-signer";

export function useWithdraw(id: string) {
  const market = useEarnMarket(id);
  const found = market.status === "ready" ? market.data : undefined;
  const input = useEarnAmount(found?.decimals ?? 0, found?.supplied.raw ?? 0n);
  const quote = found ? quoteWithdraw(found, input.amount) : null;
  const signer = useWalletSigner();

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

  return { market, input, quote, flow };
}
