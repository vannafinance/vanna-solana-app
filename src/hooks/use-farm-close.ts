import { router } from "expo-router";
import { useState } from "react";

import { formatToken } from "@/format/format-amount";
import { closeQuote, unplacedCloseQuote } from "@/lib/farm/position-math";
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
const UNPLACED_PREFIX = "unplaced-";

export const unplacedCloseId = (pool: string) => `${UNPLACED_PREFIX}${pool.toLowerCase()}`;

export function useFarmClose(id: string) {
  const state = useFarmState();
  const signer = useWalletSigner();
  const [fractionBps, setFractionBps] = useState<ExitFractionBps>(10000);

  const position = state.status === "ready" ? state.data.positions.find((candidate) => candidate.id === id) : undefined;
  // A Kamino position whose stock the history does not show closes its Kamino part only, as the web app does.
  const unplaced = state.status === "ready" && position === undefined ? state.data.unplaced.find((candidate) => unplacedCloseId(candidate.pool) === id) : undefined;
  const unplacedPrice = unplaced && state.status === "ready" ? state.data.prices[unplaced.pool] : undefined;
  const quote = position ? closeQuote(position, fractionBps) : unplaced && unplacedPrice !== undefined ? unplacedCloseQuote(unplaced, unplacedPrice, fractionBps) : null;
  const close: Resource<CloseView> = (() => {
    if (state.status !== "ready") return state;
    if (position && quote) return { status: "ready", data: { pool: position.poolSymbol, stock: position.collateralSymbol, leverage: position.leverage, quote } };
    if (unplaced && quote) return { status: "ready", data: { pool: unplaced.pool, stock: null, leverage: null, quote } };
    return { status: "empty" };
  })();

  // The stock goes back to the wallet in a second transaction, only when the whole position is closed.
  const livePlan = {
    position,
    unplaced,
    fractionBps,
    returnsStock: fractionBps === 10000 && position !== undefined,
    closesKamino: fractionBps === 10000 && unplaced !== undefined,
    poolSymbol: position?.poolSymbol ?? unplaced?.pool,
    collateralText: quote && position && fractionBps === 10000 ? `${formatToken(quote.collateralReturned, 2)} ${position.collateralSymbol}` : "",
    leftoverText: quote && (position?.poolSymbol ?? unplaced?.pool) ? `${formatToken(quote.leftover, 2)} ${position?.poolSymbol ?? unplaced?.pool}` : "",
  };
  // Step 1 repays the loan, so the next refresh no longer lists the position. A flow that has started keeps the plan it was
  // confirmed with, or the second step, its retry and the success text would all be built from a position that is gone.
  const [frozen, setFrozen] = useState<typeof livePlan | null>(null);
  const plan = frozen ?? livePlan;
  const partialFailure = new TransactionError(
    "partial",
    "Step 2 of 2 did not go through",
    `Your loan is repaid and the leftover ${plan.position?.poolSymbol ?? ""} is in your wallet. Your ${plan.collateralText} is still in the position. Try again to get it back.`,
  );

  const flow = useTransactionFlow({
    steps: plan.returnsStock ? 2 : 1,
    success: {
      title: plan.returnsStock ? "Position closed" : plan.closesKamino ? "Kamino position closed" : "Position partly closed",
      message: plan.returnsStock
        ? `${plan.collateralText} and ${plan.leftoverText} are back in your wallet`
        : plan.closesKamino
          ? `${plan.leftoverText} is back in your wallet and the loan is repaid. Any stock stays in your margin account.`
          : "Part of your loan is repaid. Your stock stays in the position.",
    },
    run: async (step, progress) => {
      if (plan.unplaced) {
        const target = plan.unplaced;
        await signer.execute(({ connection, owner, hooks }) => exitFarm(connection, owner, { pool: yieldAssetOf(target.pool), exitBps: plan.fractionBps }, hooks), progress);
        return;
      }
      const target = plan.position;
      const stock = assets.find((asset) => asset.symbol === target?.collateralSymbol);
      if (!target || !stock) throw new TransactionError("network", "Something went wrong", "The position could not be prepared. Nothing left your wallet.");

      if (step === 1) {
        const exitBps = Math.max(1, Math.round((plan.fractionBps * target.poolShareBps) / BPS));
        await signer.execute(({ connection, owner, hooks }) => exitFarm(connection, owner, { pool: yieldAssetOf(target.poolSymbol), exitBps }, hooks), progress);
        return;
      }
      await signer
        .execute(({ connection, owner, hooks }) => withdrawStock(connection, owner, stock, target.collateral.raw, hooks), progress)
        .catch(() => {
          throw partialFailure;
        });
    },
  });

  const release = () => {
    setFrozen(null);
    flow.close();
  };

  const finish = (destination: "history" | "positions") => {
    release();
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
    confirm: () => {
      setFrozen(livePlan);
      flow.start();
    },
    dismiss: () => router.back(),
    transacting: flow.state !== null,
    sheet: {
      state: flow.state,
      primaryLabel,
      onPrimary: flow.done ? () => finish("history") : flow.primary,
      onClose: flow.done ? () => finish("positions") : release,
      onExplorer: flow.openExplorer,
    },
  };
}
