import { router } from "expo-router";
import { useState } from "react";

import { formatToken, formatUsd, parseUnits } from "@/format/format-amount";
import { orderIssue, quoteOrder } from "@/lib/perps/order-quote";
import type { OrderIssue, OrderQuote, PerpsAccount, PerpsMarket, Side } from "@/types/perps";

import { combineResources } from "./resource-helpers";
import { useMarginAccount } from "./use-margin-account";
import { useMarketBySymbol } from "./use-perps-markets";
import { usePerpsPositions } from "./use-perps-positions";
import { useTransactionFlow } from "./use-transaction-flow";
import { routes } from "@/navigation/routes";

const DECIMALS = 6;
const DEFAULT_COLLATERAL = "500.00";
const DEFAULT_LEVERAGE = 3;

export type OrderTicket = {
  market: PerpsMarket;
  account: PerpsAccount;
  collateral: bigint;
  quote: OrderQuote;
  issue: OrderIssue;
};

export function usePerpsOrder(symbol: string, initialSide: Side) {
  const market = useMarketBySymbol(symbol);
  const portfolio = usePerpsPositions();
  const marginAccount = useMarginAccount();
  const [side, setSide] = useState(initialSide);
  const [amountText, setAmountText] = useState(DEFAULT_COLLATERAL);
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);

  const ticket = combineResources(market, portfolio, (perpsMarket, data): OrderTicket => {
    const collateral = parseUnits(amountText, DECIMALS) ?? 0n;
    const quote = quoteOrder({ market: perpsMarket, account: data.account, side, collateral, leverage });
    return { market: perpsMarket, account: data.account, collateral, quote, issue: orderIssue(data.account, collateral, quote) };
  });

  const ready = ticket.status === "ready" ? ticket.data : null;
  const flow = useTransactionFlow({
    success: {
      title: `Your ${side} is open`,
      message: ready
        ? `${formatToken({ raw: ready.quote.tokens, decimals: DECIMALS })} ${ready.market.symbol} ${side} at ${formatUsd(ready.market.markPrice)} · ${leverage}x · liq. ${formatUsd(ready.quote.liquidationPrice)}`
        : "",
    },
  });

  const blocked = ready === null || ready.issue === "empty" || ready.issue === "insufficient-margin";

  const quickFill = (fraction: number) => {
    if (!ready) return;
    const raw = (ready.account.available * BigInt(Math.round(fraction * 10_000))) / 10_000n;
    setAmountText(formatDecimal(raw));
  };

  const submit = () => {
    if (blocked) return;
    if (!marginAccount.exists) router.push(routes.marginCreate);
    else flow.start();
  };

  const viewPosition = () => {
    flow.close();
    router.dismissTo(routes.tradePositions);
  };

  return {
    ticket,
    side,
    setSide,
    amountText,
    setAmountText,
    leverage,
    setLeverage,
    quickFill,
    hasMarginAccount: marginAccount.exists,
    blocked,
    submit,
    flow,
    onSheetPrimary: flow.done ? viewPosition : flow.primary,
  };
}

function formatDecimal(raw: bigint) {
  const whole = raw / 10n ** BigInt(DECIMALS);
  const fraction = (raw % 10n ** BigInt(DECIMALS)).toString().padStart(DECIMALS, "0").slice(0, 2);
  return `${whole}.${fraction}`;
}
