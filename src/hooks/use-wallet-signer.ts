import { useMobileWallet } from "@wallet-ui/react-native-web3js";
import { useQueryClient } from "@tanstack/react-query";
import { type Connection, PublicKey, type VersionedTransaction } from "@solana/web3.js";
import { useCallback, useEffect, useRef } from "react";

import { DEV_WALLET_ADDRESS } from "@/lib/solana/config";
import { signWithFreshBlockhash } from "@/lib/solana/fresh-blockhash";
import { rpcConnection } from "@/lib/solana/rpc";
import type { SigningHooks } from "@/lib/solana/send-transaction";
import { toTransactionError, WALLET_MISMATCH } from "@/lib/solana/transaction-errors";
import { type RunProgress, TransactionError } from "@/types/transaction";

type SigningContext = { connection: Connection; owner: PublicKey; hooks: SigningHooks };

// The wallet signs only. In development builds a developer wallet override can show another address's data, in
// which case that address cannot be the signer and transactions are refused instead of sent from the wrong account.
export function useWalletSigner() {
  const { account, signTransactions } = useMobileWallet();
  const queryClient = useQueryClient();
  const owner = account?.address.toBase58() ?? null;
  const mismatch = DEV_WALLET_ADDRESS !== undefined && owner !== DEV_WALLET_ADDRESS;

  // The wallet hands out a new authorization token after every approval, and a signing call that outlives a render keeps the
  // token it was created with. A flow that asks twice (a lookup table, then the transaction) would present the first token
  // again and be refused, so every call goes through the latest function.
  const latest = useRef(signTransactions);
  useEffect(() => {
    latest.current = signTransactions;
  }, [signTransactions]);

  const sign = useCallback((transaction: VersionedTransaction) => signWithFreshBlockhash(rpcConnection, [transaction], () => latest.current(transaction)), []);
  const signAll = useCallback((transactions: VersionedTransaction[]) => signWithFreshBlockhash(rpcConnection, transactions, () => latest.current(transactions)), []);

  // After a confirmed transaction every live figure is stale; refetch them now instead of waiting for the next poll.
  const refreshAfterTransaction = useCallback(() => {
    for (const key of ["account-snapshot", "wallet-holdings", "earn-deposits", "earn-events", "spot-swaps", "wallet-transactions", "kamino-positions", "pools"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  // Runs one signed transaction flow and turns every failure into the error the approval sheet renders.
  const execute = useCallback(
    async (task: (context: SigningContext) => Promise<unknown>, progress: RunProgress) => {
      if (owner === null) throw new TransactionError("network", "Wallet not connected", "Connect your wallet and try again. Nothing was sent.");
      if (mismatch) throw toTransactionError(new Error(WALLET_MISMATCH));
      try {
        await task({ connection: rpcConnection, owner: new PublicKey(owner), hooks: { sign, signAll, onPrepared: progress.prepared, onSigned: progress.signed, onSent: progress.sent, onProcessed: progress.processed } });
        refreshAfterTransaction();
      } catch (error) {
        throw toTransactionError(error);
      }
    },
    [owner, mismatch, sign, signAll, refreshAfterTransaction],
  );

  return { owner, mismatch, sign, signAll, refreshAfterTransaction, execute };
}
