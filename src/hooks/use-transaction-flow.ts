import { useCallback, useState } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-web3js";

import { previewApproval } from "@/lib/preview-data/approval-outcome";
import { TransactionError, type TransactionState } from "@/types/transaction";

type Internal =
  | { phase: "idle" }
  | { phase: "signing"; step: number }
  | { phase: "confirming"; step: number }
  | { phase: "success" }
  | { phase: "failure"; step: number; error: TransactionError };

type Options = {
  steps?: number;
  wallet?: string;
  success: { title: string; message: string };
  run?: (step: number) => Promise<void>;
};

export function useTransactionFlow({ steps = 1, wallet, success, run = previewApproval }: Options) {
  const { account } = useMobileWallet();
  const walletLabel = wallet ?? account?.label ?? "your wallet";
  const [internal, setInternal] = useState<Internal>({ phase: "idle" });

  const execute = useCallback(
    async (step: number) => {
      setInternal({ phase: "confirming", step });
      try {
        await run(step);
        setInternal(step < steps ? { phase: "signing", step: step + 1 } : { phase: "success" });
      } catch (error) {
        const failure =
          error instanceof TransactionError
            ? error
            : new TransactionError("network", "Something went wrong", "The transaction did not go through. Nothing left your wallet.");
        setInternal({ phase: "failure", step, error: failure });
      }
    },
    [run, steps],
  );

  const start = useCallback(() => setInternal({ phase: "signing", step: 1 }), []);
  const close = useCallback(() => setInternal({ phase: "idle" }), []);

  const primary = useCallback(() => {
    if (internal.phase === "signing") void execute(internal.step);
    else if (internal.phase === "failure") setInternal({ phase: "signing", step: internal.step });
    else close();
  }, [internal, execute, close]);

  const state: TransactionState | null = (() => {
    switch (internal.phase) {
      case "idle":
        return null;
      case "signing":
        return { phase: "signing", step: internal.step, steps, wallet: walletLabel };
      case "confirming":
        return { phase: "confirming", title: "Confirming", message: "Waiting for Solana to confirm." };
      case "success":
        return { phase: "success", ...success };
      case "failure":
        return { phase: "failure", kind: internal.error.kind, title: internal.error.title, message: internal.error.message };
    }
  })();

  return { state, start, close, primary, done: internal.phase === "success" };
}
