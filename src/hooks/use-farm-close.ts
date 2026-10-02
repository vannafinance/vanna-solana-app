import { router } from "expo-router";
import { useState } from "react";

import { formatToken } from "@/format/format-amount";
import { closeQuote, toPositionView } from "@/lib/farm/position-math";
import { assets } from "@/lib/solana/assets";
import { exitFarm, withdrawStock, yieldAssetOf } from "@/lib/solana/farm-transactions";
import { routes } from "@/navigation/routes";
import type { CloseView, ExitFractionBps } from "@/types/farm";
import type { Resource } from "@/types/resource";
import { TransactionError } from "@/types/transaction";

import { useFarmState } from "./use-farm-state";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletSigner } from "./use-wallet-signer";

const BPS = 10_000;

export function useFarmClose(id: string) {
  const state = useFarmState();
  const signer = useWalletSigner();
  const [fractionBps, setFractionBps] = useState<ExitFractionBps>(10000);

  const position = state.status === "ready" ? state.data.positions.find((candidate) => candidate.id === id) : undefined;
  const quote = position ? closeQuote(position, fractionBps) : null;
  const close: Resource<CloseView> = (() => {
    if (state.status !== "ready") return state;
    return position && quote ? { status: "ready", data: { position: toPositionView(position), quote } } : { status: "empty" };
  })();

  // The stock goes back to the wallet in a second transaction, only when the whole position is closed.
  const returnsStock = fractionBps === 10000;
  const collateralText = quote && position && returnsStock ? `${formatToken(quote.collateralReturned, 2)} ${position.collateralSymbol}` : "";
  const leftoverText = quote && position ? `${formatToken(quote.leftover, 2)} ${position.poolSymbol}` : "";
  const partialFailure = new TransactionError(
    "partial",
    "Step 2 of 2 did not go through",
    `Your loan is repaid and the leftover ${position?.poolSymbol ?? ""} is in your wallet. Your ${collateralText} is still in the position. Try again to get it back.`,
  );

  const flow = useTransactionFlow({
    steps: returnsStock ? 2 : 1,
    success: {
      title: returnsStock ? "Position closed" : "Position partly closed",
      message: returnsStock ? `${collateralText} and ${leftoverText} are back in your wallet` : `${leftoverText} is back in your wallet and part of your loan is repaid`,
    },
    run: async (step, progress) => {
      const stock = assets.find((asset) => asset.symbol === position?.collateralSymbol);
      if (!position || !stock) throw new TransactionError("network", "Something went wrong", "The position could not be prepared. Nothing left your wallet.");

      if (step === 1) {
        const exitBps = Math.max(1, Math.round((fractionBps * position.poolShareBps) / BPS));
        await signer.execute(({ connection, owner, hooks }) => exitFarm(connection, owner, { pool: yieldAssetOf(position.poolSymbol), exitBps }, hooks), progress);
        return;
      }
      await signer
        .execute(({ connection, owner, hooks }) => withdrawStock(connection, owner, stock, position.collateral.raw, hooks), progress)
        .catch(() => {
          throw partialFailure;
        });
    },
  });

  const finish = (destination: "history" | "positions") => {
    flow.close();
    if (destination === "history") router.dismissTo("/farm/history");
    else if (returnsStock) router.dismissTo(routes.farmPositions);
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
      onExplorer: flow.openExplorer,
    },
  };
}
