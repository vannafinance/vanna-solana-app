import { router } from "expo-router";
import { useRef, useState } from "react";

import { formatPercent, formatSignedPercent, formatToken, formatUsd } from "@/format/format-amount";
import { DASH, FARM_HEALTH, healthText, yearlyText } from "@/format/format-farm";
import { toInputText } from "@/lib/farm/amount-text";
import { buildDeployForm } from "@/lib/farm/deploy-form";
import { heldCollaterals, stepHeld } from "@/lib/farm/farm-math";
import { strategyPreview } from "@/lib/farm/strategy-preview";
import { assets } from "@/lib/solana/assets";
import { NETWORK_FEE_ESTIMATE, NETWORK_LABEL } from "@/lib/solana/config";
import { deployFarm, freshDeployProgress, yieldAssetOf } from "@/lib/solana/farm-transactions";
import { routes } from "@/navigation/routes";
import type { CollateralSymbol, DeployForm, FarmCollateral, MarginNow, PoolSymbol, StrategyPreview } from "@/types/farm";
import type { Resource } from "@/types/resource";
import type { ReviewTone } from "@/types/review";
import { TransactionError } from "@/types/transaction";

import { useClearAfterSuccess } from "./use-clear-after-success";
import { useConnectedWallet } from "./use-connected-wallet";
import { useFarmPoolSources } from "./use-farm-pools";
import { useMarginAccount } from "./use-margin-account";
import { useMarginOverview } from "./use-margin-overview";
import { useOraclePrices } from "./use-oracle-prices";
import { useReviewStep } from "./use-review-step";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletAddress } from "./use-wallet-address";
import { useWalletHoldings } from "./use-wallet-holdings";
import { useWalletSigner } from "./use-wallet-signer";

// As on the web app: 1x deposits the stock only, with no borrow and nothing supplied to Kamino.
const DEFAULT_LEVERAGE = 1;
const LOW_PRECISION_DECIMALS = 6;
const STOCK_SYMBOLS: readonly CollateralSymbol[] = ["TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI"];
const NO_ACCOUNT: MarginNow = { hasAccount: false, collateralUsd: 0n, debtUsd: 0n, netUsd: 0n, health: null, leverage: null };

export type DeployScreen = { form: DeployForm; preview: StrategyPreview | null };

export function isPoolSymbol(value: string | undefined): value is PoolSymbol {
  return value === "USDC" || value === "SOL";
}

function reviewTone(value: number): ReviewTone {
  if (value > 0) return "positive";
  return value < 0 ? "negative" : "default";
}

function balanceText(collateral: FarmCollateral) {
  return toInputText({ raw: collateral.balance, decimals: collateral.decimals });
}

// The Deploy screen of one pool: the stock deposit, the leverage, the live strategy preview, the review and the transaction.
export function useFarmDeploy(poolSymbol: PoolSymbol) {
  const wallet = useWalletAddress();
  const connected = useConnectedWallet();
  const margin = useMarginAccount();
  const overview = useMarginOverview();
  const holdings = useWalletHoldings(wallet);
  const prices = useOraclePrices();
  const sources = useFarmPoolSources();
  const signer = useWalletSigner();
  // Until the user picks one, the first stock the wallet holds.
  const [collateralSymbol, setCollateralSymbol] = useState<CollateralSymbol | null>(null);
  const [amountText, setAmountText] = useState("");
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  // How far the last attempt got, so trying again after a stop does not deposit or borrow a second time.
  const progress = useRef(freshDeployProgress());

  const collaterals: FarmCollateral[] = STOCK_SYMBOLS.flatMap((symbol) => {
    const price = prices.data?.[symbol];
    const asset = assets.find((candidate) => candidate.symbol === symbol);
    if (price === undefined || asset === undefined) return [];
    const held = holdings.data?.holdings.find((holding) => holding.symbol === symbol);
    return [{ symbol, decimals: asset.decimals, priceUsd: price, balance: held?.raw ?? 0n }];
  });

  const account: MarginNow =
    overview.status === "ready" && overview.data.hasMarginAccount
      ? {
          hasAccount: true,
          collateralUsd: overview.data.collateral,
          debtUsd: overview.data.borrowed,
          netUsd: overview.data.net,
          health: overview.data.health,
          leverage: overview.data.leverage,
        }
      : NO_ACCOUNT;

  const pool = sources.pools.find((candidate) => candidate.symbol === poolSymbol);
  const selectedCollateral = collaterals.find((collateral) => collateral.symbol === collateralSymbol)?.symbol ?? heldCollaterals(collaterals)[0]?.symbol;
  const data: DeployForm | null =
    holdings.data !== undefined && pool !== undefined && selectedCollateral !== undefined
      ? buildDeployForm({
          pools: sources.pools,
          collaterals,
          poolSymbol: pool.symbol,
          collateralSymbol: selectedCollateral,
          amountText,
          leverage,
          account: { collateralUsd: account.collateralUsd, debtUsd: account.debtUsd },
        })
      : null;
  const preview = data === null ? null : strategyPreview(data, account);

  const holdingsFailed = holdings.isError && holdings.data === undefined ? holdings.error : null;
  const pricesFailed = prices.isError && prices.data === undefined ? prices.error : null;
  const failed = sources.error ?? holdingsFailed ?? pricesFailed;
  const refetchAll = () => {
    sources.retry();
    void holdings.refetch();
  };
  const screen: Resource<DeployScreen> = data
    ? { status: "ready", data: { form: data, preview } }
    : failed
      ? { status: "error", error: failed, retry: refetchAll }
      : wallet === null || (sources.settled && pool === undefined)
        ? { status: "empty" }
        : { status: "loading" };

  const borrowDigits = data && data.pool.decimals <= LOW_PRECISION_DECIMALS ? 2 : 3;

  const flow = useTransactionFlow({
    run: (_step, runProgress) =>
      signer.execute(({ connection, owner, hooks }) => {
        const stock = assets.find((asset) => asset.symbol === data?.collateral.symbol);
        if (data === null || stock === undefined || data.issue !== null) {
          throw new TransactionError("network", "Something went wrong", "The strategy could not be prepared. Nothing left your wallet.");
        }
        return deployFarm(connection, owner, { stock, pool: yieldAssetOf(data.pool.symbol), collateral: data.amount.raw, borrow: data.quote.borrow.raw }, hooks, progress.current);
      }, runProgress),
    success: {
      title: "Strategy deployed",
      message: data
        ? data.leverage <= 1
          ? `${formatToken(data.amount, 2)} ${data.collateral.symbol} swapped to about ${formatToken(data.quote.supplied, borrowDigits)} ${data.pool.symbol}, earning ${formatPercent(data.pool.supplyApyBps)} on Kamino`
          : `${formatToken(data.amount, 2)} ${data.collateral.symbol} deposited · ${formatToken(data.quote.borrow, borrowDigits)} ${data.pool.symbol} earning ${formatPercent(data.pool.supplyApyBps)} on Kamino`
        : "",
    },
  });

  useClearAfterSuccess(flow.done, () => {
    setAmountText("");
    setLeverage(DEFAULT_LEVERAGE);
  });

  const selectCollateral = (symbol: CollateralSymbol) => {
    if (!collaterals.some((collateral) => collateral.symbol === symbol)) return;
    setCollateralSymbol(symbol);
    setAmountText("");
  };

  const closeFlow = () => {
    progress.current = freshDeployProgress();
    flow.close();
  };

  const finishDeploy = () => {
    closeFlow();
    router.navigate(routes.farmPositions);
  };

  // What the user sees before the wallet opens: what leaves their wallet, what is borrowed against it and where it goes,
  // what it should earn, and how far the stock can fall before the position is liquidated.
  const review = useReviewStep(() => {
    if (!(data && preview && connected)) return null;
    const stock = data.collateral.symbol;
    const borrowed = `${formatToken(preview.borrow, borrowDigits)} ${data.pool.symbol}`;
    return {
      title: "Review strategy",
      legs: [
        ...(data.leverage <= 1
          ? [
              { label: "You deposit", value: `${formatToken(data.amount, 2)} ${stock}`, caption: `${formatUsd(data.quote.collateralValueUsd)}, swapped to ${data.pool.symbol} in your margin account` },
              {
                label: "Supplied to Kamino, no loan",
                value: `≈ ${formatToken(preview.supplied, borrowDigits)} ${data.pool.symbol}`,
                caption: `${formatUsd(preview.suppliedUsd)} · earns ${formatPercent(preview.supplyApyBps)}. Closing returns ${data.pool.symbol}, not ${stock}`,
              },
            ]
          : [
              { label: "You deposit", value: `${formatToken(data.amount, 2)} ${stock}`, caption: `${formatUsd(data.quote.collateralValueUsd)} kept as collateral` },
              {
                label: "Borrowed from Vanna, supplied to Kamino",
                value: borrowed,
                caption: `${formatUsd(preview.borrowUsd)} · pays ${formatPercent(preview.borrowApyBps)}, earns ${formatPercent(preview.supplyApyBps)}`,
              },
            ]),
      ],
      rows: [
        { label: "Leverage", value: `${data.leverage}x` },
        // Five rows, as before the restructure, so the sheet fits a phone without scrolling.
        { label: "Projected net return", value: `${yearlyText(preview.yearlyNetUsd)} · ${formatSignedPercent(preview.netApyBps)}`, tone: reviewTone(preview.netApyBps) },
        { label: `Health after (liq. ${FARM_HEALTH.liquidation.toFixed(2)})`, value: healthText(preview.health.after) },
        {
          label: `${stock} liquidation price`,
          value: preview.liquidationPriceUsd > 0n ? `${formatUsd(preview.liquidationPriceUsd)} · ${formatPercent(preview.liquidationDropBps, 0)} drop` : DASH,
          tone: "negative",
        },
        { label: "Network fee", value: NETWORK_FEE_ESTIMATE },
      ],
      wallet: connected,
      network: NETWORK_LABEL,
      confirmLabel: "Confirm strategy",
    };
  }, flow.start);

  return {
    screen,
    needsWallet: wallet === null,
    needsMarginAccount: !margin.exists,
    selectCollateral,
    stepCollateral: (direction: 1 | -1) => {
      if (data) selectCollateral(stepHeld(data.held, data.collateral.symbol, direction));
    },
    setAmountText,
    fillMax: () => {
      if (data) setAmountText(balanceText(data.collateral));
    },
    setLeverage,
    deploy: () => (margin.exists ? review.request() : router.push(routes.marginCreate)),
    review,
    sheet: {
      state: flow.state,
      primaryLabel: flow.done ? "View position" : undefined,
      onPrimary: flow.done ? finishDeploy : flow.primary,
      onClose: closeFlow,
      onExplorer: flow.openExplorer,
    },
  };
}
