import { useCallback, useEffect, useRef, useState } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-web3js";

import { previewApproval } from "@/lib/preview-data/approval-outcome";
import { type RunProgress, TransactionError, type TransactionState } from "@/types/transaction";

export const DEFAULT_WALLET = "your wallet";

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
  run?: (step: number, progress: RunProgress) => Promise<void>;
};

export function useTransactionFlow({ steps = 1, wallet, success, run = previewApproval }: Options) {
  const { account } = useMobileWallet();
  const walletLabel = wallet ?? account?.label ?? DEFAULT_WALLET;
  const [internal, setInternal] = useState<Internal>({ phase: "idle" });
  const attempt = useRef(0);

  useEffect(
    () => () => {
      attempt.current += 1;
    },
    [],
  );

  const execute = useCallback(
    async (firstStep: number) => {
      const current = ++attempt.current;
      const live = () => attempt.current === current;
      let step = firstStep;
      try {
        for (; step <= steps; step++) {
          setInternal({ phase: "signing", step });
          const stepNumber = step;
          await run(stepNumber, {
            signed: () => {
              if (live()) setInternal({ phase: "confirming", step: stepNumber });
            },
          });
          if (!live()) return;
        }
        setInternal({ phase: "success" });
      } catch (error) {
        if (!live()) return;
        const failure =
          error instanceof TransactionError
            ? error
            : new TransactionError("network", "Something went wrong", "The transaction did not go through. Nothing left your wallet.");
        setInternal({ phase: "failure", step, error: failure });
      }
    },
    [run, steps],
  );

  const start = useCallback(() => void execute(1), [execute]);
  const close = useCallback(() => {
    attempt.current += 1;
    setInternal({ phase: "idle" });
  }, []);

  const primary = useCallback(() => {
    if (internal.phase === "failure") void execute(internal.step);
    else if (internal.phase === "success") close();
  }, [internal, execute, close]);

  const state: TransactionState | null = (() => {
    switch (internal.phase) {
      case "idle":
        return null;
      case "signing":
        return { phase: "signing", step: internal.step, steps, wallet: walletLabel };
      case "confirming":
        return { phase: "confirming", title: "Sent to Solana", message: "Usually under 2 seconds" };
      case "success":
        return { phase: "success", ...success };
      case "failure":
        return internal.error.kind === "rejected"
          ? { phase: "failure", kind: "rejected", title: `Cancelled in ${walletLabel}`, message: "Nothing was sent." }
          : { phase: "failure", kind: internal.error.kind, title: internal.error.title, message: internal.error.message };
    }
  })();

  return { state, start, close, primary, done: internal.phase === "success" };
}
