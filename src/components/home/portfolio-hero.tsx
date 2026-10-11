import { ModuleHero, ModuleHeroPlaceholder } from "@/components/ui/module-hero";
import { formatSignedUsd, formatUsd, formatUsdOrDash } from "@/format/format-amount";
import type { Portfolio } from "@/types/portfolio";
import type { Resource } from "@/types/resource";

import { missingCaption } from "./portfolio-format";

const LABEL = "Net worth";

// The Portfolio header, the same on Overview, Lender and Trader: everything the user owns, split into the three places it
// sits. The wallet, what is lent in Earn, and the margin account's own part (collateral minus borrowed), which Trade and
// Farm share.
export function PortfolioHero({ portfolio }: { portfolio: Resource<Portfolio> }) {
  if (portfolio.status !== "ready") {
    const message = portfolio.status === "error" ? "Can't load your balances" : portfolio.status === "empty" ? "No wallet connected" : undefined;
    return <ModuleHeroPlaceholder label={LABEL} message={message} />;
  }

  const data = portfolio.data;
  const missing = data.netWorthMissing.length > 0 ? missingCaption(data.netWorthMissing) : undefined;
  // One chip: all-time P&L (lending earnings plus open trading P&L). The split is in the cards below.
  const parts = [data.netEarnings, data.tradingPnl].filter((part): part is bigint => part !== null);
  const pnl = parts.length > 0 ? parts.reduce((sum, part) => sum + part, 0n) : null;
  const chips =
    missing === undefined && pnl !== null
      ? [
          pnl === 0n
            ? { text: "$0.00 P&L" }
            : { text: `${formatSignedUsd(pnl)} P&L`, icon: pnl > 0n ? ("trending_up" as const) : ("trending_down" as const), tone: pnl > 0n ? ("positive" as const) : ("negative" as const) },
        ]
      : undefined;

  return (
    <ModuleHero
      label={LABEL}
      value={formatUsd(data.netWorth)}
      caption={missing}
      chips={chips}
      stats={[
        { label: "Wallet", value: formatUsdOrDash(data.walletBalance) },
        { label: "Earn", value: formatUsdOrDash(data.earnSupplied) },
        { label: "Margin (net)", value: data.hasMarginAccount ? formatUsd(data.netAvailable) : "—" },
      ]}
    />
  );
}
