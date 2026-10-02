import { useCallback, useEffect, useRef, useState } from "react";
import { useMobileWallet } from "@wallet-ui/react-native-web3js";
import { router } from "expo-router";

import { FORK_FAUCET_ENABLED } from "@/lib/solana/config";
import { explorerTransactionUrl } from "@/lib/solana/explorer";
import * as WebBrowser from "expo-web-browser";

import { routes } from "@/navigation/routes";
import { type ConfirmStage, type RunProgress, TransactionError, type TransactionState } from "@/types/transaction";

export const DEFAULT_WALLET = "your wallet";

type Internal =
  | { phase: "idle" }
  | { phase: "signing"; step: number; prepared: boolean }
  | { phase: "confirming"; step: number; stage: ConfirmStage; signature?: string }
  | { phase: "success"; signature?: string }
  | { phase: "failure"; step: number; error: TransactionError };

type Options = {
  steps?: number;
  wallet?: string;
  success: { title: string; message: string };
  run: (step: number, progress: RunProgress) => Promise<void>;
};

const CONFIRMING_COPY: Record<ConfirmStage, { title: string; message: string }> = {
  sending: { title: "Sending to Solana", message: "Broadcasting your signed transaction" },
  sent: { title: "Sent to Solana", message: "Usually under 2 seconds" },
  processed: { title: "Processed by Solana", message: "Waiting for final confirmation" },
};

export function useTransactionFlow({ steps = 1, wallet, success, run }: Options) {
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
          setInternal({ phase: "signing", step, prepared: false });
          const stepNumber = step;
          await run(stepNumber, {
            prepared: () => {
              if (live()) setInternal((current) => (current.phase === "signing" ? { ...current, prepared: true } : current));
            },
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

  // A wallet with no SOL cannot retry its way out, so the fork build sends it to the faucet instead.
  const primary = useCallback(() => {
    if (internal.phase === "failure" && internal.error.kind === "no-fee" && FORK_FAUCET_ENABLED) {
      close();
      router.push(routes.faucet);
    } else if (internal.phase === "failure") void execute(internal.step);
    else if (internal.phase === "success") close();
  }, [internal, execute, close]);

  const state: TransactionState | null = (() => {
    switch (internal.phase) {
      case "idle":
        return null;
      case "signing":
        return { phase: "signing", step: internal.step, steps, wallet: walletLabel, prepared: internal.prepared };
      case "confirming":
        return { phase: "confirming", stage: internal.stage, signature: internal.signature, ...CONFIRMING_COPY[internal.stage] };
      case "success":
        return { phase: "success", ...success, signature: internal.signature };
      case "failure":
        return internal.error.kind === "rejected"
          ? { phase: "failure", kind: "rejected", title: `Cancelled in ${walletLabel}`, message: "Nothing was sent." }
          : {
              phase: "failure",
              kind: internal.error.kind,
              title: internal.error.title,
              message: internal.error.message,
              actionLabel: internal.error.kind === "no-fee" && FORK_FAUCET_ENABLED ? "Get test SOL" : undefined,
            };
    }
  })();

  const explorerSignature = internal.phase === "confirming" || internal.phase === "success" ? internal.signature : undefined;
  const openExplorer = explorerSignature === undefined ? undefined : () => void WebBrowser.openBrowserAsync(explorerTransactionUrl(explorerSignature));

  return { state, start, close, primary, done: internal.phase === "success", openExplorer };
}
