import { router } from "expo-router";
import { useState } from "react";

import { formatUsd } from "@/format/format-amount";
import { quoteAddCollateral } from "@/lib/perps/add-collateral-quote";
import { depositUsdcCollateral } from "@/lib/solana/margin-deposit";
import type { AddCollateralQuote, PerpsAccount, PositionSummary } from "@/types/perps";
import type { Resource } from "@/types/resource";
import { TransactionError } from "@/types/transaction";

import { useMarketList } from "./use-market-list";
import { usePerpsPositions } from "./use-perps-positions";
import { useTransactionFlow } from "./use-transaction-flow";
import { useWalletAddress } from "./use-wallet-address";
import { useWalletHoldings } from "./use-wallet-holdings";
import { useWalletSigner } from "./use-wallet-signer";

const USD = 1_000_000n;

export const COLLATERAL_PRESETS: readonly bigint[] = [100n * USD, 250n * USD, 500n * USD, 1_000n * USD];

export type AddCollateralTicket = {
  position: PositionSummary;
  account: PerpsAccount;
  quote: AddCollateralQuote;
  insufficient: boolean;
};

// The deposit comes from the wallet's USDC, as on the web app, so that balance is what limits the amount.
export function usePerpsAddCollateral(id: string) {
  const wallet = useWalletAddress();
  const portfolio = usePerpsPositions();
  const markets = useMarketList();
  const holdings = useWalletHoldings(wallet);
  const signer = useWalletSigner();
  const [amount, setAmount] = useState(500n * USD);

  const walletUsdc = holdings.data?.holdings.find((holding) => holding.symbol === "USDC")?.raw ?? 0n;

  const ticket: Resource<AddCollateralTicket> = (() => {
    if (portfolio.status !== "ready") return portfolio.status === "empty" ? { status: "empty" } : portfolio;
    if (markets.status !== "ready") return markets.status === "empty" ? { status: "empty" } : markets;
    if (holdings.data === undefined) return holdings.isError ? { status: "error", error: holdings.error, retry: () => void holdings.refetch() } : { status: "loading" };
    const position = portfolio.data.positions.find((candidate) => candidate.id === id);
    const market = markets.data.find((candidate) => candidate.symbol === position?.symbol);
    if (!position || !market) return { status: "empty" };
    return {
      status: "ready",
      data: {
        position,
        account: { ...portfolio.data.account, available: walletUsdc },
        quote: quoteAddCollateral({ position, market, walletUsdc, amount }),
        insufficient: amount > walletUsdc,
      },
    };
  })();

  const ready = ticket.status === "ready" ? ticket.data : null;
  const flow = useTransactionFlow({
    run: (_step, progress) =>
      signer.execute(({ connection, owner, hooks }) => {
        if (ready === null || ready.insufficient) throw new TransactionError("network", "Something went wrong", "The deposit could not be prepared. Nothing left your wallet.");
        return depositUsdcCollateral(connection, owner, amount, hooks);
      }, progress),
    success: {
      title: "Collateral added",
      message: ready ? `${formatUsd(amount)} USDC is now backing your margin account, so every position is further from liquidation.` : "",
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
