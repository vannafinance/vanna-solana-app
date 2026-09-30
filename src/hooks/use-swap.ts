import { useCallback, useMemo, useState } from "react";

import { formatSwapAmount } from "@/format/format-swap-amount";
import { parseUnits } from "@/format/format-amount";
import { fractionOfBalance } from "@/lib/swap/fraction-of-balance";
import { quoteExactIn } from "@/lib/swap/quote";
import { AUTO_SLIPPAGE_BPS, effectiveSlippageBps } from "@/lib/swap/slippage";
import { previewSwapDraft, previewSwapRoutes, previewSwapTokens } from "@/lib/preview-data/swap";
import type { Resource } from "@/types/resource";
import type { SwapIssue, SwapRouteId, SwapSettings, SwapState, SwapSymbol, SwapToken } from "@/types/swap";

import { useTransactionFlow } from "./use-transaction-flow";

function findToken(tokens: readonly SwapToken[], symbol: SwapSymbol): SwapToken {
  const token = tokens.find((candidate) => candidate.symbol === symbol);
  if (!token) throw new Error(`Unknown swap token ${symbol}`);
  return token;
}

export function useSwap() {
  const tokens = previewSwapTokens;
  const [fromSymbol, setFromSymbol] = useState<SwapSymbol>(previewSwapDraft.from);
  const [toSymbol, setToSymbol] = useState<SwapSymbol>(previewSwapDraft.to);
  const [amountText, setAmountText] = useState(previewSwapDraft.amountText);
  const [settings, setSettings] = useState<SwapSettings>(previewSwapDraft.settings);
  const [routeId, setRouteId] = useState<SwapRouteId>("jupiter");

  const from = findToken(tokens, fromSymbol);
  const to = findToken(tokens, toSymbol);
  const slippageBps = effectiveSlippageBps(settings);
  const amountIn = parseUnits(amountText, from.decimals);

  const { quote, issue } = useMemo(() => {
    if (amountIn === null || amountIn === 0n) return { quote: null, issue: "no-amount" as SwapIssue };
    return {
      quote: quoteExactIn(amountIn, from, to, slippageBps),
      issue: amountIn > from.balance ? ("insufficient-balance" as SwapIssue) : null,
    };
  }, [amountIn, from, to, slippageBps]);

  const flow = useTransactionFlow({
    success: {
      title: "Swapped",
      message:
        amountIn !== null && quote
          ? `${formatSwapAmount(amountIn, from.decimals, from.symbol)} ${from.symbol} → ${formatSwapAmount(quote.amountOut, to.decimals, to.symbol)} ${to.symbol}`
          : "",
    },
  });

  const pickToken = useCallback(
    (side: "from" | "to", symbol: SwapSymbol) => {
      const other = side === "from" ? toSymbol : fromSymbol;
      const displaced = symbol === other ? (side === "from" ? fromSymbol : toSymbol) : other;
      setFromSymbol(side === "from" ? symbol : displaced);
      setToSymbol(side === "from" ? displaced : symbol);
    },
    [fromSymbol, toSymbol],
  );

  const flip = useCallback(() => {
    setFromSymbol(toSymbol);
    setToSymbol(fromSymbol);
    setAmountText(quote ? fractionOfBalance(quote.amountOut, to.decimals, 1) : "");
  }, [fromSymbol, toSymbol, quote, to.decimals]);

  const fill = useCallback((fraction: number) => setAmountText(fractionOfBalance(from.balance, from.decimals, fraction)), [from]);

  const selectRoute = useCallback((id: SwapRouteId) => {
    if (previewSwapRoutes.some((route) => route.id === id && route.available)) setRouteId(id);
  }, []);

  const route = previewSwapRoutes.find((candidate) => candidate.id === routeId) ?? previewSwapRoutes[0];
  const swap: Resource<SwapState> = {
    status: "ready",
    data: { tokens, from, to, amountText, quote, issue, settings, slippageBps, autoSlippageBps: AUTO_SLIPPAGE_BPS, route, routes: previewSwapRoutes },
  };

  return {
    swap,
    setAmountText,
    pickFrom: (symbol: SwapSymbol) => pickToken("from", symbol),
    pickTo: (symbol: SwapSymbol) => pickToken("to", symbol),
    flip,
    fill,
    selectRoute,
    saveSettings: setSettings,
    flow,
  };
}
