import { formatToken } from "@/format/format-amount";
import { quoteSupply } from "@/lib/earn/quote";
import { supplyToVault } from "@/lib/solana/earn-transactions";
import { TransactionError } from "@/types/transaction";

import { useEarnAmount } from "./use-earn-amount";
import { useEarnMarket } from "./use-earn-market";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletSigner } from "./use-wallet-signer";

export function useSupply(id: string) {
  const market = useEarnMarket(id);
  const found = market.status === "ready" ? market.data : undefined;
  const input = useEarnAmount(found?.decimals ?? 0, found?.walletBalance.raw ?? 0n);
  const quote = found ? quoteSupply(found, input.amount) : null;
  const signer = useWalletSigner();

  const flow = useTransactionFlow({
    run: (_step, progress) =>
      signer.execute(({ connection, owner, hooks }) => {
        if (found === undefined || input.amount === 0n) throw new TransactionError("network", "Something went wrong", "The supply could not be prepared. Nothing left your wallet.");
        return supplyToVault(connection, owner, found.symbol, input.amount, hooks);
      }, progress),
    success: {
      title: "Supplied",
      message: `${formatToken({ raw: input.amount, decimals: found?.decimals ?? 0 }, 2)} ${found?.symbol ?? ""} is now earning in the ${found?.symbol ?? ""} vault`,
    },
  });

  return { market, input, quote, flow };
}
