import { type HeroStat, ModuleHero, ModuleHeroPlaceholder } from "@/components/ui/module-hero";
import { formatPercent, formatSignedUsd, formatUsd } from "@/format/format-amount";
import type { EarnPortfolio } from "@/types/earn";
import type { Resource } from "@/types/resource";

const LABEL = "Your supply";

function earnedStat(earned: bigint | null): HeroStat {
  if (earned === null) return { label: "Earned", value: "—" };
  return earned > 0n ? { label: "Earned", value: formatSignedUsd(earned), tone: "positive" } : { label: "Earned", value: formatUsd(earned) };
}

// The Earn header, the same on Vaults, Positions and History: what the wallet has supplied across all vaults.
export function EarnHero({ portfolio }: { portfolio: Resource<EarnPortfolio> }) {
  if (portfolio.status === "loading") return <ModuleHeroPlaceholder label={LABEL} />;
  if (portfolio.status === "error") return <ModuleHeroPlaceholder label={LABEL} message="Can't load your supply" />;
  if (portfolio.status === "empty") return <ModuleHeroPlaceholder label={LABEL} message="Connect a wallet to start earning" />;

  const { summary, earnedUsd } = portfolio.data;
  const count = summary.assetCount;
  return (
    <ModuleHero
      label={LABEL}
      value={formatUsd(summary.suppliedUsd)}
      caption={count === 0 ? "Supply to a vault to start earning" : undefined}
      stats={[
        { label: "Assets", value: String(count) },
        { label: "Avg supply APY", value: count === 0 ? "—" : formatPercent(summary.averageSupplyApyBps) },
        earnedStat(earnedUsd),
      ]}
    />
  );
}
