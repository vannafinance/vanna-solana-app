import { formatPercent, formatUsd } from "@/format/format-amount";
import type { DeployForm } from "@/types/farm";

import { FarmHero, type FarmHeroStat } from "./farm-hero";
import { formatHealth, formatYearlyCaption, healthColor, healthLabel } from "./farm-format";

function healthStat(form: DeployForm): FarmHeroStat {
  if (form.amount.raw <= 0n) return { label: "Health", value: "—", dot: { color: "onHero", opacity: 0.5 } };
  if (form.quote.healthFactor === null) return { label: "Health", value: "No debt", dot: { color: "heroPositive" } };
  const factor = form.quote.healthFactor;
  return { label: "Health", value: `${formatHealth(factor)} · ${healthLabel(factor)}`, dot: { color: healthColor(factor) } };
}

function liquidationText(form: DeployForm): string {
  if (form.amount.raw <= 0n) return "—";
  if (form.quote.healthFactor === null) return "None at 1x";
  return `${form.collateral.symbol} below ${formatUsd(form.quote.liquidationPriceUsd)}`;
}

export function DeployHero({ form }: { form: DeployForm }) {
  return (
    <FarmHero
      dense
      label="You earn"
      value={formatPercent(form.quote.netApyBps)}
      suffix="APY"
      caption={formatYearlyCaption(form)}
      stats={[healthStat(form), { label: "Liquidation", value: liquidationText(form) }]}
    />
  );
}
