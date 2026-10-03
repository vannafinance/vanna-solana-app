import { router } from "expo-router";
import { useRef, useState } from "react";

import { formatPercent, formatToken, formatUsd } from "@/format/format-amount";
import { toInputText } from "@/lib/farm/amount-text";
import { buildDeployForm } from "@/lib/farm/deploy-form";
import { stepHeld } from "@/lib/farm/farm-math";
import { assets } from "@/lib/solana/assets";
import { NETWORK_FEE_ESTIMATE, NETWORK_LABEL } from "@/lib/solana/config";
import { deployFarm, freshDeployProgress, yieldAssetOf } from "@/lib/solana/farm-transactions";
import { YIELD_SYMBOLS } from "@/lib/solana/kamino";
import { routes } from "@/navigation/routes";
import type { CollateralSymbol, DeployForm, FarmCollateral, FarmPool, PoolSymbol } from "@/types/farm";
import type { Resource } from "@/types/resource";
import { TransactionError } from "@/types/transaction";

import { useAccountSnapshot } from "./use-account-snapshot";
import { useConnectedWallet } from "./use-connected-wallet";
import { useKaminoStats } from "./use-kamino-stats";
import { useMarginAccount } from "./use-margin-account";
import { useOraclePrices } from "./use-oracle-prices";
import { useReviewStep } from "./use-review-step";
import { usePools } from "./use-pools";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletAddress } from "./use-wallet-address";
import { useWalletHoldings } from "./use-wallet-holdings";
import { useWalletSigner } from "./use-wallet-signer";

const DEFAULT_LEVERAGE = 2;
const LOW_PRECISION_DECIMALS = 6;
const MARKET = "Kamino Main Market";
const STOCK_SYMBOLS: readonly CollateralSymbol[] = ["TSLAx", "GOOGLx", "AAPLx", "ANTHROPIC", "OPENAI"];

// Interest accrues between the read and the transaction, so a little of the free liquidity is kept back.
const LIQUIDITY_MARGIN = 0.99;

function borrowableOf(totalSupply: number, totalBorrowed: number, decimals: number): bigint {
  return BigInt(Math.max(0, Math.floor((totalSupply - totalBorrowed) * LIQUIDITY_MARGIN * 10 ** decimals)));
}

function balanceText(collateral: FarmCollateral) {
  return toInputText({ raw: collateral.balance, decimals: collateral.decimals });
}

export function useFarmDeploy() {
  const wallet = useWalletAddress();
  const connected = useConnectedWallet();
  const margin = useMarginAccount();
  const account = useAccountSnapshot(wallet);
  const holdings = useWalletHoldings(wallet);
  const prices = useOraclePrices();
  const stats = useKaminoStats();
  const vanna = usePools();
  const signer = useWalletSigner();
  const [poolSymbol, setPoolSymbol] = useState<PoolSymbol>("USDC");
  const [collateralSymbol, setCollateralSymbol] = useState<CollateralSymbol>("TSLAx");
  const [amountText, setAmountText] = useState("");
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  // How far the last attempt got, so trying again after a stop does not deposit or borrow a second time.
  const progress = useRef(freshDeployProgress());

  // Everything here is a live read: the pool's rates and liquidity from Kamino, what the program charges to borrow, the
  // wallet's stock balances and the oracle prices that value them.
  const pools: FarmPool[] = YIELD_SYMBOLS.flatMap((symbol) => {
    const price = prices.data?.[symbol];
    const kamino = stats.data?.[symbol];
    const borrowPercent = vanna.data?.[symbol]?.borrowApyPercent;
    const decimals = assets.find((asset) => asset.symbol === symbol)?.decimals;
    const reserve = vanna.data?.[symbol];
    if (price === undefined || !kamino || borrowPercent === undefined || decimals === undefined || reserve === undefined) return [];
    return [
      {
        symbol,
        market: MARKET,
        decimals,
        priceUsd: price,
        supplyApyBps: kamino.supplyApyBps,
        borrowApyBps: Math.round(borrowPercent * 100),
        available: kamino.available,
        borrowable: borrowableOf(reserve.totalSupply, reserve.totalBorrowed, decimals),
        totalSupplied: kamino.totalSupplied,
        utilizationBps: kamino.utilizationBps,
      },
    ];
  });
  const collaterals: FarmCollateral[] = STOCK_SYMBOLS.flatMap((symbol) => {
    const price = prices.data?.[symbol];
    const asset = assets.find((candidate) => candidate.symbol === symbol);
    if (price === undefined || asset === undefined) return [];
    const held = holdings.data?.holdings.find((holding) => holding.symbol === symbol);
    return [{ symbol, decimals: asset.decimals, priceUsd: price, balance: held?.raw ?? 0n }];
  });

  const selectedPool = pools.find((pool) => pool.symbol === poolSymbol)?.symbol ?? pools[0]?.symbol;
  const selectedCollateral = collaterals.find((collateral) => collateral.symbol === collateralSymbol)?.symbol ?? collaterals[0]?.symbol;
  const data: DeployForm | null =
    holdings.data !== undefined && selectedPool !== undefined && selectedCollateral !== undefined
      ? buildDeployForm({
          pools,
          collaterals,
          poolSymbol: selectedPool,
          collateralSymbol: selectedCollateral,
          amountText,
          leverage,
          account: { collateralUsd: account.data?.collateral ?? 0n, debtUsd: account.data?.borrowed ?? 0n },
        })
      : null;

  const failed = [prices, stats, vanna, holdings].find((query) => query.isError && query.data === undefined);
  const refetchAll = () => {
    void prices.refetch();
    void stats.refetch();
    void vanna.refetch();
    void holdings.refetch();
  };
  const form: Resource<DeployForm> = data
    ? { status: "ready", data }
    : failed?.error
      ? { status: "error", error: failed.error, retry: refetchAll }
      : wallet === null
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
        ? `${formatToken(data.amount, 2)} ${data.collateral.symbol} deposited · ${formatToken(data.quote.borrow, borrowDigits)} ${data.pool.symbol} earning ${formatPercent(data.pool.supplyApyBps)} on Kamino`
        : "",
    },
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

  // What the user sees before the wallet opens: what leaves their wallet, what is borrowed against it and where that goes.
  const review = useReviewStep(() => {
    if (!(data && connected)) return null;
    return {
      title: "Review strategy",
      legs: [
        { label: "You deposit", value: `${formatToken(data.amount, 2)} ${data.collateral.symbol}`, caption: `≈ ${formatUsd(data.quote.collateralValueUsd)} kept as collateral` },
        {
          label: "Borrowed and supplied to Kamino",
          value: `${formatToken(data.quote.borrow, borrowDigits)} ${data.pool.symbol}`,
          caption: `≈ ${formatUsd(data.quote.debtUsd)} earning ${formatPercent(data.pool.supplyApyBps)}`,
        },
      ],
      rows: [
        { label: "Leverage", value: `${data.leverage}x` },
        { label: "Health factor", value: data.quote.healthFactor === null ? "No debt" : data.quote.healthFactor.toFixed(2) },
        { label: "Liquidated below", value: `${formatUsd(data.quote.liquidationPriceUsd)} per ${data.collateral.symbol}`, tone: "negative" },
        { label: "Net APY on the borrow", value: formatPercent(data.quote.netApyBps), tone: data.quote.netApyBps >= 0 ? "positive" : "negative" },
        { label: "Network fee", value: NETWORK_FEE_ESTIMATE },
      ],
      wallet: connected,
      network: NETWORK_LABEL,
      confirmLabel: "Confirm strategy",
    };
  }, flow.start);

  return {
    form,
    needsMarginAccount: !margin.exists,
    selectPool: setPoolSymbol,
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
