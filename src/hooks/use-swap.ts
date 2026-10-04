import { router } from "expo-router";
import { useCallback, useState } from "react";

import { formatPriceImpact, formatSlippage, formatSwapAmount } from "@/format/format-swap-amount";
import { formatUsd, parseUnits } from "@/format/format-amount";
import { fractionOfBalance } from "@/lib/swap/fraction-of-balance";
import { defaultSwapSettings, swapRoutes } from "@/lib/swap/routes";
import { AUTO_SLIPPAGE_BPS, effectiveSlippageBps } from "@/lib/swap/slippage";
import { routes } from "@/navigation/routes";
import type { Resource } from "@/types/resource";
import type { SwapIssue, SwapRouteId, SwapSettings, SwapState, SwapSymbol, SwapToken } from "@/types/swap";

import { assets } from "@/lib/solana/assets";
import { NETWORK_FEE_ESTIMATE, NETWORK_LABEL } from "@/lib/solana/config";
import { executeWalletSwap } from "@/lib/solana/swap-execution";
import { TransactionError } from "@/types/transaction";

import { useConnectedWallet } from "./use-connected-wallet";
import { usePerpsTabFocus } from "./use-perps-tab-focus";
import { useReviewStep } from "./use-review-step";
import { useSwapQuote } from "./use-swap-quote";
import { useSwapTokens } from "./use-swap-tokens";
import { useWalletSigner } from "./use-wallet-signer";
import { useClearAfterSuccess } from "./use-clear-after-success";
import { useTransactionFlow } from "./use-transaction-flow";

function findToken(tokens: readonly SwapToken[], symbol: SwapSymbol): SwapToken {
  const token = tokens.find((candidate) => candidate.symbol === symbol);
  if (!token) throw new Error(`Unknown swap token ${symbol}`);
  return token;
}

const HIGH_IMPACT_BPS = 300;
const DEFAULT_FROM: SwapSymbol = "USDC";
const DEFAULT_TO: SwapSymbol = "TSLAx";

export function useSwap() {
  usePerpsTabFocus("swap");
  const tokens = useSwapTokens();
  const [fromSymbol, setFromSymbol] = useState<SwapSymbol>(DEFAULT_FROM);
  const [toSymbol, setToSymbol] = useState<SwapSymbol>(DEFAULT_TO);
  const [amountText, setAmountText] = useState("");
  const [settings, setSettings] = useState<SwapSettings>(defaultSwapSettings);
  const [routeId, setRouteId] = useState<SwapRouteId>("jupiter");
  const wallet = useConnectedWallet();

  const list = tokens.status === "ready" ? tokens.data : null;
  const from = list ? findToken(list, fromSymbol) : null;
  const to = list ? findToken(list, toSymbol) : null;
  const slippageBps = effectiveSlippageBps(settings);
  const amountIn = from ? parseUnits(amountText, from.decimals) : null;

  const placeholder: SwapToken = { symbol: fromSymbol, name: "", decimals: 0, priceUsd: 1n, balance: 0n };
  const live = useSwapQuote(from ?? placeholder, to ?? placeholder, from && to ? amountIn : null, slippageBps);
  const quote = live.quote;
  const issue: SwapIssue | null = (() => {
    if (amountIn === null || amountIn === 0n) return "no-amount";
    if (from && amountIn > from.balance) return "insufficient-balance";
    if (live.noRoute) return "no-route";
    if (live.failed) return "quote-failed";
    return quote === null || live.loading ? "quoting" : null;
  })();

  const signer = useWalletSigner();
  const mintOf = (symbol: SwapSymbol) => assets.find((asset) => asset.symbol === symbol)?.mint;

  const flow = useTransactionFlow({
    run: (_step, progress) =>
      signer.execute(({ connection, owner, hooks }) => {
        const inputMint = mintOf(fromSymbol);
        const outputMint = mintOf(toSymbol);
        if (inputMint === undefined || outputMint === undefined || amountIn === null || amountIn === 0n) {
          throw new TransactionError("network", "Something went wrong", "The swap could not be prepared. Nothing left your wallet.");
        }
        return executeWalletSwap(connection, { owner: owner.toBase58(), inputMint, outputMint, amount: amountIn, slippageBps }, hooks);
      }, progress),
    success: {
      title: "Swapped",
      message:
        amountIn !== null && quote && from && to
          ? `${formatSwapAmount(amountIn, from.decimals, from.symbol)} ${from.symbol} → ${formatSwapAmount(quote.amountOut, to.decimals, to.symbol)} ${to.symbol}`
          : "",
    },
  });

  // What the user sees before the wallet opens. The amounts are the live quote; the swap itself fetches a fresh one when
  // it is confirmed, so the wallet shows the final figures.
  const review = useReviewStep(() => {
    if (!(from && to && quote && amountIn !== null && wallet)) return null;
    return {
      title: "Review swap",
      legs: [
        { label: "You pay", value: `${formatSwapAmount(amountIn, from.decimals, from.symbol)} ${from.symbol}`, caption: `≈ ${formatUsd(quote.payValueUsd)}` },
        { label: "You receive (estimated)", value: `${formatSwapAmount(quote.amountOut, to.decimals, to.symbol)} ${to.symbol}`, caption: `≈ ${formatUsd(quote.receiveValueUsd)}` },
      ],
      rows: [
        { label: "Route", value: "Jupiter" },
        { label: "Price impact", value: formatPriceImpact(quote.priceImpactBps), tone: quote.priceImpactBps >= HIGH_IMPACT_BPS ? "negative" : "positive" },
        { label: "Minimum received", value: `${formatSwapAmount(quote.minReceived, to.decimals, to.symbol)} ${to.symbol}` },
        { label: "Slippage", value: formatSlippage(quote.slippageBps, settings.mode === "auto") },
        { label: "Network fee", value: NETWORK_FEE_ESTIMATE },
      ],
      wallet,
      network: NETWORK_LABEL,
      confirmLabel: "Confirm swap",
    };
  }, flow.start);

  useClearAfterSuccess(flow.done, () => setAmountText(""));

  const viewHistory = () => {
    flow.close();
    router.navigate(routes.tradeHistory);
  };

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
    setAmountText(quote && to ? fractionOfBalance(quote.amountOut, to.decimals, 1) : "");
  }, [fromSymbol, toSymbol, quote, to]);

  const fill = useCallback((fraction: number) => from && setAmountText(fractionOfBalance(from.balance, from.decimals, fraction)), [from]);

  const selectRoute = useCallback((id: SwapRouteId) => {
    if (swapRoutes.some((route) => route.id === id && route.available)) setRouteId(id);
  }, []);

  const route = swapRoutes.find((candidate) => candidate.id === routeId) ?? swapRoutes[0];
  const swap: Resource<SwapState> =
    tokens.status !== "ready" || !from || !to
      ? tokens.status === "ready" ? { status: "empty" } : tokens
      : {
          status: "ready",
          stale: tokens.stale,
          refresh: tokens.refresh,
          data: { tokens: tokens.data, from, to, amountText, quote, issue, settings, slippageBps, autoSlippageBps: AUTO_SLIPPAGE_BPS, route, routes: swapRoutes },
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
    review,
    onSheetPrimary: flow.done ? viewHistory : flow.primary,
  };
}
