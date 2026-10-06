// Replaces src/hooks/use-wallet-signer.ts (same return shape) so every transaction flow in the app runs end to end
// without a chain: the app's own review / approval / progress / success / failure UI is driven exactly like on a
// phone, but the transaction task itself is never built or sent.
//
//   prepared -> the wallet stand-in asks to approve (packages/mwa-transact.js) -> signed -> sent (fake signature)
//   -> processed -> success; afterwards a user without a margin account has one (sample-data openMarginAccount)
//   and every live query is refreshed.
//
// A failure queued in the control panel is raised at the point it happens on a real network, as the same error text
// the app would get, so the app's own error mapping (toTransactionError) produces the message the user sees.

import { useMobileWallet } from "@wallet-ui/react-native-web3js";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { isWalletRefusal, toTransactionError } from "@/lib/solana/transaction-errors";
import { TransactionError } from "@/types/transaction";

import { openMarginAccount } from "../sample-data";

const WALLET_ATTEMPTS = 2;
const RETRY_PAUSE_MS = 1500;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const proto = () => globalThis.__vnProto;

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const fakeSignature = () => {
  let signature = "";
  for (let i = 0; i < 88; i++) signature += BASE58[Math.floor(58 * Math.random())];
  return signature;
};

// What the network / program answers for each failure the panel can queue.
const FAILURE_TEXT = {
  slippage: '{"InstructionError":[2,{"Custom":6001}]} Program log: Error: SlippageToleranceExceeded',
  "no-tokens": '{"InstructionError":[1,{"Custom":1}]} Program log: Error: insufficient funds',
  expired: "Transaction simulation failed: Blockhash not found",
  "no-sol": "Transaction simulation failed: Attempt to debit an account but found no record of a prior credit.",
  network: "Network request failed",
};

export function useWalletSigner() {
  const { account, signTransactions } = useMobileWallet();
  const queryClient = useQueryClient();
  const owner = account?.address.toBase58() ?? null;

  const refreshAfterTransaction = useCallback(() => {
    for (const key of ["account-snapshot", "wallet-holdings", "earn-deposits", "earn-events", "spot-swaps", "wallet-transactions", "kamino-positions", "pools"]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [queryClient]);

  // Nothing is signed for real; callers that sign directly get their transactions back.
  const sign = useCallback(async (transaction) => transaction, []);
  const signAll = useCallback(async (transactions) => transactions, []);

  const execute = useCallback(
    async (_task, progress) => {
      if (owner === null) throw new TransactionError("network", "Wallet not connected", "Connect your wallet and try again. Nothing was sent.");

      // Building the transaction: price moved / not enough tokens / offline fail before the wallet opens.
      await wait(700);
      const beforeSigning = proto().takeNetworkFailure(["slippage", "no-tokens", "offline"]);
      if (beforeSigning === "offline") throw toTransactionError(new Error(FAILURE_TEXT.network));
      if (beforeSigning) throw toTransactionError(new Error(FAILURE_TEXT[beforeSigning]));
      progress.prepared();

      // The wallet: a refused authorization is retried once, like the real hook does.
      for (let attempt = 1; ; attempt++) {
        try {
          await signTransactions({ prototype: true });
          break;
        } catch (error) {
          if (attempt < WALLET_ATTEMPTS && isWalletRefusal(error)) {
            await wait(RETRY_PAUSE_MS);
            continue;
          }
          throw toTransactionError(error);
        }
      }
      progress.signed();

      // Sending: expired / no SOL for fees / network error, or "step 1 lands, step 2 fails" (queues a network error
      // for the next step of a two-step flow).
      await wait(450);
      const afterSigning = proto().takeNetworkFailure(["expired", "no-sol", "network", "step2"]);
      if (afterSigning === "step2") proto().setNext("network");
      else if (afterSigning) throw toTransactionError(new Error(FAILURE_TEXT[afterSigning]));

      progress.sent(fakeSignature());
      await wait(900);
      progress.processed();
      await wait(1000);
      openMarginAccount();
      refreshAfterTransaction();
    },
    [owner, signTransactions, refreshAfterTransaction],
  );

  return { owner, mismatch: false, sign, signAll, refreshAfterTransaction, execute };
}
