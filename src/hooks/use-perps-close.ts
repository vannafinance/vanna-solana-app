import { router } from "expo-router";
import { useState } from "react";

import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { quoteClose } from "@/lib/perps/close-quote";
import { assets } from "@/lib/solana/assets";
import { closePosition } from "@/lib/solana/perps-close";
import type { CloseQuote, PositionSummary } from "@/types/perps";
import { TransactionError } from "@/types/transaction";

import { mapResource } from "./resource-helpers";
import { usePerpsPositions } from "./use-perps-positions";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletSigner } from "./use-wallet-signer";

export const CLOSE_FRACTIONS_BPS = [2_500, 5_000, 7_500, 10_000] as const;

export type CloseTicket = { position: PositionSummary; quote: CloseQuote };

export function usePerpsClose(id: string) {
  const portfolio = usePerpsPositions();
  const signer = useWalletSigner();
  const [fractionBps, setFractionBps] = useState<number>(10_000);

  const ticket = mapResource(portfolio, (data): CloseTicket | null => {
    const position = data.positions.find((candidate) => candidate.id === id);
    return position ? { position, quote: quoteClose(position, fractionBps) } : null;
  });

  const ready = ticket.status === "ready" ? ticket.data : null;
  const flow = useTransactionFlow({
    run: (_step, progress) =>
      signer.execute(({ connection, owner, hooks }) => {
        const stock = ready === null ? undefined : assets.find((asset) => asset.symbol === ready.position.symbol);
        if (ready === null || stock === undefined) {
          throw new TransactionError("network", "Something went wrong", "The position could not be found. Nothing left your wallet.");
        }
        const { position } = ready;
        return closePosition(
          connection,
          owner,
          { side: position.side, stock, exitPercent: fractionBps / 100, stockPrice: position.markPrice, debtShareUsd: position.sizeUsd - position.collateral },
          hooks,
        );
      }, progress),
    success: {
      title: fractionBps === 10_000 ? "Position closed" : "Position reduced",
      message: ready ? `${formatSignedUsd(ready.quote.pnl)} realized · ${formatUsd(ready.quote.toWallet)} ${ready.quote.returnsTo === "wallet" ? "is back in your wallet" : "stays in your margin account"}.` : "",
    },
  });

  const dismiss = () => router.back();
  const finish = () => {
    flow.close();
    router.back();
  };

  return {
    ticket,
    fractionBps,
    setFractionBps,
    flow,
    submit: flow.start,
    dismiss,
    onSheetPrimary: flow.done ? finish : flow.primary,
    onSheetClose: flow.done ? finish : flow.close,
  };
}
