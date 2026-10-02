import { useCallback, useEffect, useRef, useState } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-web3js";

import { previewApproval } from "@/lib/preview-data/approval-outcome";
import { explorerTransactionUrl } from "@/lib/solana/explorer";
import * as WebBrowser from "expo-web-browser";

import { type ConfirmStage, type RunProgress, TransactionError, type TransactionState } from "@/types/transaction";

export const DEFAULT_WALLET = "your wallet";

type Internal =
  | { phase: "idle" }
  | { phase: "signing"; step: number }
  | { phase: "confirming"; step: number; stage: ConfirmStage; signature?: string }
  | { phase: "success"; signature?: string }
  | { phase: "failure"; step: number; error: TransactionError };

type Options = {
  steps?: number;
  wallet?: string;
  success: { title: string; message: string };
  run?: (step: number, progress: RunProgress) => Promise<void>;
};

const CONFIRMING_COPY: Record<ConfirmStage, { title: string; message: string }> = {
  sending: { title: "Sending to Solana", message: "Broadcasting your signed transaction" },
  sent: { title: "Sent to Solana", message: "Usually under 2 seconds" },
  processed: { title: "Processed by Solana", message: "Waiting for final confirmation" },
};

export function useTransactionFlow({ steps = 1, wallet, success, run = previewApproval }: Options) {
  const { account } = useMobileWallet();
  const walletLabel = wallet ?? account?.label ?? DEFAULT_WALLET;
  const [internal, setInternal] = useState<Internal>({ phase: "idle" });
  const attempt = useRef(0);
  const signature = useRef<string | undefined>(undefined);

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
      signature.current = undefined;
      try {
        for (; step <= steps; step++) {
          setInternal({ phase: "signing", step });
          const stepNumber = step;
          await run(stepNumber, {
            signed: () => {
              if (live()) setInternal({ phase: "confirming", step: stepNumber, stage: "sending" });
            },
            sent: (sent) => {
              signature.current = sent;
              if (live()) setInternal({ phase: "confirming", step: stepNumber, stage: "sent", signature: sent });
            },
            processed: () => {
              if (live()) setInternal((current) => (current.phase === "confirming" ? { ...current, stage: "processed" } : current));
            },
          });
          if (!live()) return;
        }
        setInternal({ phase: "success", signature: signature.current });
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
        return { phase: "confirming", stage: internal.stage, signature: internal.signature, ...CONFIRMING_COPY[internal.stage] };
      case "success":
        return { phase: "success", ...success, signature: internal.signature };
      case "failure":
        return internal.error.kind === "rejected"
          ? { phase: "failure", kind: "rejected", title: `Cancelled in ${walletLabel}`, message: "Nothing was sent." }
          : { phase: "failure", kind: internal.error.kind, title: internal.error.title, message: internal.error.message };
    }
  })();

  const explorerSignature = internal.phase === "confirming" || internal.phase === "success" ? internal.signature : undefined;
  const openExplorer = explorerSignature === undefined ? undefined : () => void WebBrowser.openBrowserAsync(explorerTransactionUrl(explorerSignature));

  return { state, start, close, primary, done: internal.phase === "success", openExplorer };
}
