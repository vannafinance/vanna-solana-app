import { router } from "expo-router";
import { useState } from "react";

import { formatUsd } from "@/format/format-amount";
import { quoteAddCollateral } from "@/lib/perps/add-collateral-quote";
import type { AddCollateralQuote, PerpsAccount, PositionSummary } from "@/types/perps";

import { mapResource } from "./resource-helpers";
import { usePerpsPositions } from "./use-perps-positions";
import { useTransactionFlow } from "./use-transaction-flow";

const USD = 1_000_000n;

export const COLLATERAL_PRESETS: readonly bigint[] = [100n * USD, 250n * USD, 500n * USD, 1_000n * USD];

export type AddCollateralTicket = {
  position: PositionSummary;
  account: PerpsAccount;
  quote: AddCollateralQuote;
  insufficient: boolean;
};

export function usePerpsAddCollateral(id: string) {
  const portfolio = usePerpsPositions();
  const [amount, setAmount] = useState(500n * USD);

  const ticket = mapResource(portfolio, (data): AddCollateralTicket | null => {
    const position = data.positions.find((candidate) => candidate.id === id);
    if (!position) return null;
    return {
      position,
      account: data.account,
      quote: quoteAddCollateral(position, data.account, amount),
      insufficient: amount > data.account.available,
    };
  });

  const quote = ticket.status === "ready" ? ticket.data.quote : null;
  const position = ticket.status === "ready" ? ticket.data.position : null;
  const flow = useTransactionFlow({
    success: {
      title: "Collateral added",
      message: quote && position ? `${position.pair} now liquidates at ${formatUsd(quote.liquidationAfter)}, further from the mark.` : "",
    },
  });

  const dismiss = () => router.back();
  const finish = () => {
    flow.close();
    router.back();
  };

  return {
    ticket,
    amount,
    setAmount,
    flow,
    submit: flow.start,
    dismiss,
    onSheetPrimary: flow.done ? finish : flow.primary,
    onSheetClose: flow.done ? finish : flow.close,
  };
}
