import { router } from "expo-router";
import { useState, useSyncExternalStore } from "react";
import { Linking } from "react-native";

import { formatToken } from "@/format/format-amount";
import { explorerAccountUrl } from "@/lib/farm/explorer";
import { closeQuote, reducePosition, toPositionView } from "@/lib/farm/position-math";
import { getFarmPositions, previewCloseStep, replaceFarmPosition, subscribeFarmPositions } from "@/lib/preview-data/farm";
import { previewSession } from "@/lib/preview-data/session";
import type { CloseView, ExitFractionBps } from "@/types/farm";
import type { Resource } from "@/types/resource";
import { TransactionError } from "@/types/transaction";

import { useTransactionFlow } from "./use-transaction-flow";
import { routes } from "@/navigation/routes";

const CLOSE_STEPS = 2;

export function useFarmClose(id: string) {
  const positions = useSyncExternalStore(subscribeFarmPositions, getFarmPositions);
  const [fractionBps, setFractionBps] = useState<ExitFractionBps>(10000);

  const position = positions.find((candidate) => candidate.id === id);
  const quote = position ? closeQuote(position, fractionBps) : null;
  const close: Resource<CloseView> = position && quote ? { status: "ready", data: { position: toPositionView(position), quote } } : { status: "empty" };

  const collateralText = quote && position ? `${formatToken(quote.collateralReturned, 2)} ${position.collateralSymbol}` : "";
  const leftoverText = quote && position ? `${formatToken(quote.leftover, 2)} ${position.poolSymbol}` : "";
  const partialFailure = new TransactionError(
    "partial",
    "Step 2 of 2 did not go through",
    `Your loan is repaid and the leftover ${position?.poolSymbol ?? ""} is in your wallet. Your ${collateralText} is still in the position. Try again to get it back.`,
  );

  const flow = useTransactionFlow({
    steps: CLOSE_STEPS,
    success: {
      title: fractionBps === 10000 ? "Position closed" : "Position partly closed",
      message: `${collateralText} and ${leftoverText} are back in your wallet`,
    },
    run: (step) => previewCloseStep(step, partialFailure),
  });

  const finish = (destination: "history" | "positions") => {
    flow.close();
    if (position) replaceFarmPosition(id, reducePosition(position, fractionBps));
    if (destination === "history") router.dismissTo("/farm/history");
    else if (fractionBps === 10000) router.dismissTo(routes.farmPositions);
    else router.back();
  };

  const failedPartially = flow.state?.phase === "failure" && flow.state.kind === "partial";
  const primaryLabel = flow.done ? "View history" : failedPartially ? "Try step 2 again" : undefined;

  return {
    close,
    fractionBps,
    selectFraction: setFractionBps,
    confirm: flow.start,
    dismiss: () => router.back(),
    transacting: flow.state !== null,
    sheet: {
      state: flow.state,
      primaryLabel,
      onPrimary: flow.done ? () => finish("history") : flow.primary,
      onClose: flow.done ? () => finish("positions") : flow.close,
      onExplorer: () => void Linking.openURL(explorerAccountUrl(previewSession.walletAddress)),
    },
  };
}
