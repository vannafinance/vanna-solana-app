import { router } from "expo-router";
import { PublicKey } from "@solana/web3.js";
import { useCallback, useState } from "react";

import { formatToken, formatUsd, parseUnits } from "@/format/format-amount";
import { shortAddress } from "@/format/short-address";
import { collateralBaseUnits, orderFunds } from "@/lib/perps/order-funds";
import { orderIssue, quoteOrder } from "@/lib/perps/order-quote";
import { assets } from "@/lib/solana/assets";
import { NETWORK_FEE_ESTIMATE, NETWORK_LABEL } from "@/lib/solana/config";
import { createMarginAccount } from "@/lib/solana/margin-transactions";
import { openPosition } from "@/lib/solana/perps-transactions";
import { marginAddress } from "@/lib/solana/program-accounts";
import { routes } from "@/navigation/routes";
import type { EnvelopeStage } from "@/types/margin-account";
import type { OrderIssue, OrderQuote, PerpsAccount, PerpsMarket, Side } from "@/types/perps";
import type { Resource } from "@/types/resource";
import { TransactionError } from "@/types/transaction";

import { useConnectedWallet } from "./use-connected-wallet";
import { useMarginAccount } from "./use-margin-account";
import { useMarketBySymbol } from "./use-perps-markets";
import { usePerpsPositions } from "./use-perps-positions";
import { useReviewStep } from "./use-review-step";
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
  const connected = useConnectedWallet();
  const [side, setSide] = useState(initialSide);
  const [amountText, setAmountText] = useState("");
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  // A first trade opens the margin account as its step 1. This is decided when the order is submitted and kept until the
  // sheet closes, because the account appearing on chain after step 1 must not turn a retry of step 2 into a one-step flow.
  const [firstTrade, setFirstTrade] = useState(false);
  const [step, setStep] = useState(1);

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
    steps: firstTrade ? 2 : 1,
    run: (stepNumber, progress) => {
      setStep(stepNumber);
      return signer.execute(({ connection, owner, hooks }) => {
        if (firstTrade && stepNumber === 1) return createMarginAccount(connection, owner, hooks);
        const stock = assets.find((asset) => asset.symbol === symbol);
        if (ready === null || funds === null || stock === undefined || ready.collateral === 0n) {
          throw new TransactionError("network", "Something went wrong", "The order could not be prepared. Nothing left your wallet.");
        }
        const base = collateralBaseUnits(side, funds, ready.collateral, ready.market.markPrice);
        return openPosition(connection, owner, { side, stock, collateral: base, leverage }, hooks);
      }, progress);
    },
    success: {
      title: `Your ${side} is open`,
      message: ready
        ? `${formatToken({ raw: ready.quote.tokens, decimals: DECIMALS })} ${ready.market.symbol} ${side} at ${formatUsd(ready.market.markPrice)} · ${leverage}x · liq. ${formatUsd(ready.quote.liquidationPrice)}`
        : "",
    },
  });

  // What the user sees before the wallet opens: the collateral committed and the position it opens.
  const review = useReviewStep(() => {
    if (ready === null || !connected) return null;
    const { market, quote } = ready;
    return {
      title: `Review ${side}`,
      legs: [
        { label: "You commit", value: formatUsd(ready.collateral), caption: side === "long" ? "USDC from your wallet, as margin" : `${market.symbol} from your wallet, as margin` },
        { label: `Your ${side}`, value: `${formatToken({ raw: quote.tokens, decimals: DECIMALS })} ${market.symbol}`, caption: `≈ ${formatUsd(quote.size)} at ${leverage}x` },
      ],
      rows: [
        { label: "Entry price", value: formatUsd(market.markPrice) },
        { label: "Liquidation price", value: formatUsd(quote.liquidationPrice), tone: "negative" },
        { label: "Health after", value: quote.healthAfter.toFixed(2) },
        { label: "Network fee", value: NETWORK_FEE_ESTIMATE },
        ...(marginAccount.exists ? [] : [{ label: "Margin account", value: "Opens first, 2 approvals" }]),
      ],
      wallet: connected,
      network: NETWORK_LABEL,
      confirmLabel: `Confirm ${side}`,
    };
  }, flow.start);

  const blocked = ready === null || ready.issue !== null;

  const quickFill = (fraction: number) => {
    if (!ready) return;
    const raw = (ready.account.available * BigInt(Math.round(fraction * 10_000))) / 10_000n;
    setAmountText(formatDecimal(raw));
  };

  const submit = () => {
    if (blocked) return;
    setFirstTrade(!marginAccount.exists);
    setStep(1);
    review.request();
  };

  const closeFlow = () => {
    flow.close();
    setFirstTrade(false);
  };

  const viewPosition = () => {
    closeFlow();
    router.dismissTo(routes.tradePositions);
  };

  const envelope: { address: string; stage: EnvelopeStage } | null =
    firstTrade && signer.owner !== null ? { address: shortAddress(marginAddress(new PublicKey(signer.owner)).toBase58()), stage: step === 1 ? "waiting" : "open" } : null;

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
    review,
    flow,
    envelope,
    closeFlow,
    onSheetPrimary: flow.done ? viewPosition : flow.primary,
  };
}

function formatDecimal(raw: bigint) {
  const whole = raw / 10n ** BigInt(DECIMALS);
  const fraction = (raw % 10n ** BigInt(DECIMALS)).toString().padStart(DECIMALS, "0").slice(0, 2);
  return `${whole}.${fraction}`;
}
