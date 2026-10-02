import { router } from "expo-router";
import { useCallback, useState } from "react";

import { formatToken, formatUsd, parseUnits } from "@/format/format-amount";
import { collateralBaseUnits, orderFunds } from "@/lib/perps/order-funds";
import { orderIssue, quoteOrder } from "@/lib/perps/order-quote";
import { assets } from "@/lib/solana/assets";
import { openPosition } from "@/lib/solana/perps-transactions";
import { routes } from "@/navigation/routes";
import type { OrderIssue, OrderQuote, PerpsAccount, PerpsMarket, Side } from "@/types/perps";
import type { Resource } from "@/types/resource";
import { TransactionError } from "@/types/transaction";

import { useMarginAccount } from "./use-margin-account";
import { useMarketBySymbol } from "./use-perps-markets";
import { usePerpsPositions } from "./use-perps-positions";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletAddress } from "./use-wallet-address";
import { useWalletHoldings } from "./use-wallet-holdings";
import { useWalletSigner } from "./use-wallet-signer";

const DECIMALS = 6;
const DEFAULT_LEVERAGE = 3;

export type OrderTicket = {
  market: PerpsMarket;
  account: PerpsAccount;
  collateral: bigint;
  quote: OrderQuote;
  issue: OrderIssue;
};

export function usePerpsOrder(symbol: string, initialSide: Side) {
  const wallet = useWalletAddress();
  const market = useMarketBySymbol(symbol);
  const portfolio = usePerpsPositions();
  const holdings = useWalletHoldings(wallet);
  const marginAccount = useMarginAccount();
  const signer = useWalletSigner();
  const [side, setSide] = useState(initialSide);
  const [amountText, setAmountText] = useState("");
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);

  const funds = market.status === "ready" && holdings.data ? orderFunds(side, market.data.symbol, market.data.markPrice, holdings.data.holdings) : null;
  const collateral = parseUnits(amountText, DECIMALS) ?? 0n;

  const { refetch: refetchHoldings } = holdings;
  const retry = useCallback(() => void refetchHoldings(), [refetchHoldings]);

  const ticket: Resource<OrderTicket> = (() => {
    if (market.status !== "ready") return market;
    if (portfolio.status !== "ready") return portfolio.status === "empty" ? { status: "empty" } : portfolio;
    if (funds === null) return holdings.isError ? { status: "error", error: holdings.error, retry } : { status: "loading" };
    const { account } = portfolio.data;
    const quote = quoteOrder({ market: market.data, margin: account.margin, borrowed: account.borrowed, side, collateral, leverage });
    // Collateral is deposited from the wallet in the same transaction, as on the web app, so what can be committed is
    // the wallet's balance of the collateral asset, not the margin account's free balance.
    return {
      status: "ready",
      data: { market: market.data, account: { ...account, available: funds.usd }, collateral, quote, issue: orderIssue(funds.usd, collateral, quote) },
    };
  })();

  const ready = ticket.status === "ready" ? ticket.data : null;
  const flow = useTransactionFlow({
    run: (_step, progress) =>
      signer.execute(({ connection, owner, hooks }) => {
        const stock = assets.find((asset) => asset.symbol === symbol);
        if (ready === null || funds === null || stock === undefined || ready.collateral === 0n) {
          throw new TransactionError("network", "Something went wrong", "The order could not be prepared. Nothing left your wallet.");
        }
        const base = collateralBaseUnits(side, funds, ready.collateral, ready.market.markPrice);
        return openPosition(connection, owner, { side, stock, collateral: base, leverage }, hooks);
      }, progress),
    success: {
      title: `Your ${side} is open`,
      message: ready
        ? `${formatToken({ raw: ready.quote.tokens, decimals: DECIMALS })} ${ready.market.symbol} ${side} at ${formatUsd(ready.market.markPrice)} · ${leverage}x · liq. ${formatUsd(ready.quote.liquidationPrice)}`
        : "",
    },
  });

  const blocked = ready === null || ready.issue !== null;

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
