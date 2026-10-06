import { useState } from "react";

import { useAccountSnapshot } from "@/hooks/use-account-snapshot";
import { useWalletAddress } from "@/hooks/use-wallet-address";
import { earningsSeries, interestAccrued, tradeLedger } from "@/lib/perps/trade-earnings";
import { withoutFarm } from "@/lib/perps/without-farm";
import { type AssetSymbol, assets } from "@/lib/solana/assets";
import type { EarningsRange, PerpsPortfolio, TradeEarnings } from "@/types/perps";
import type { Resource } from "@/types/resource";

import { useFarmState } from "./use-farm-state";
import { useMarketList } from "./use-market-list";
import { usePerpsActivity } from "./use-perps-activity";

const decimalsOf = (symbol: AssetSymbol) => assets.find((asset) => asset.symbol === symbol)?.decimals ?? 0;

// Net earnings of margin trading over time (closed trades from history plus today's open P&L), and the borrow interest the
// open positions owe so far, for the Positions page.
export function useTradeEarnings(portfolio: Resource<PerpsPortfolio>) {
  const [range, setRange] = useState<EarningsRange>("All");
  const wallet = useWalletAddress();
  const account = useAccountSnapshot(wallet);
  const activity = usePerpsActivity();
  const markets = useMarketList();
  const farm = useFarmState();

  const earnings: Resource<TradeEarnings> = (() => {
    if (portfolio.status !== "ready") return portfolio;
    if (activity.status === "loading" || activity.status === "error") return activity;
    if (account.data === undefined) return { status: "loading" };

    // Earnings come from what went through; failed transactions moved nothing.
    const entries = activity.status === "ready" ? activity.data.filter((entry) => entry.status !== "failed") : [];
    const ledger = tradeLedger(entries);
    const readable = portfolio.data.positionsAvailable;
    const positions = readable ? portfolio.data.positions : [];
    const openPnl = readable ? portfolio.data.openPnl : null;
    const now = account.dataUpdatedAt;
    const { points, stepMs } = earningsSeries(ledger.realized, openPnl ?? 0n, ledger.firstAt, range, now);
    const snapshot = account.data;
    const interest =
      !readable || markets.status !== "ready" || farm.status !== "ready"
        ? null
        : interestAccrued({
            positions,
            principal: ledger.principal,
            debt: withoutFarm({ collateral: snapshot.collateralBalances, debt: snapshot.borrowedBalances }, farm.data.positions).debt,
            prices: Object.fromEntries(markets.data.map((market) => [market.symbol, market.markPrice])),
            decimals: decimalsOf,
          });

    return {
      status: "ready",
      data: {
        net: points[points.length - 1].usd,
        points,
        stepMs,
        now,
        noTrades: ledger.firstAt === null && positions.length === 0,
        partial: ledger.unmatched > 0,
        openPnl,
        openCount: readable ? positions.length : null,
        interest,
      },
    };
  })();

  return { earnings, range, setRange };
}
