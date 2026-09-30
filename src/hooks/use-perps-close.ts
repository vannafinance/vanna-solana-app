import { router } from "expo-router";
import { useState } from "react";

import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import { quoteClose } from "@/lib/perps/close-quote";
import type { CloseQuote, PositionSummary } from "@/types/perps";

import { mapResource } from "./resource-helpers";
import { usePerpsPositions } from "./use-perps-positions";
import { useTransactionFlow } from "./use-transaction-flow";

export const CLOSE_FRACTIONS_BPS = [2_500, 5_000, 7_500, 10_000] as const;

export type CloseTicket = { position: PositionSummary; quote: CloseQuote };

export function usePerpsClose(id: string) {
  const portfolio = usePerpsPositions();
  const [fractionBps, setFractionBps] = useState<number>(10_000);

  const ticket = mapResource(portfolio, (data): CloseTicket | null => {
    const position = data.positions.find((candidate) => candidate.id === id);
    return position ? { position, quote: quoteClose(position, fractionBps) } : null;
  });

  const quote = ticket.status === "ready" ? ticket.data.quote : null;
  const flow = useTransactionFlow({
    success: {
      title: fractionBps === 10_000 ? "Position closed" : "Position reduced",
      message: quote ? `${formatSignedUsd(quote.pnl)} realized · ${formatUsd(quote.toMargin)} is back in your margin account.` : "",
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
