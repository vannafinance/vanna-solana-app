import { healthLabel } from "@/components/home/position-format";
import { type HeroStat, type HeroTone, ModuleHero, ModuleHeroPlaceholder } from "@/components/ui/module-hero";
import { formatPercent, formatUnits, formatUsd } from "@/format/format-amount";
import { health as thresholds } from "@/theme/tokens";
import type { MarginOverview } from "@/types/margin-overview";
import type { Resource } from "@/types/resource";

// The account's whole value: everything it holds, which is the user's own part (net available collateral) plus what was
// borrowed into it. The health factor is this value divided by the debt.
const LABEL = "Margin account value";

function wholeUsd(raw: bigint) {
  return `$${formatUnits(raw, 6, 0)}`;
}

function healthTone(health: number): HeroTone {
  return health >= thresholds.safeFrom ? "positive" : "watch";
}

// The figures under the account: the health factor with its state as a pill, how much collateral value the account can lose
// before the health factor reaches 1.10, and how much of the account this module uses. The last two carry a bar across their
// column, so short figures still fill it.
export function marginStats(data: MarginOverview, module: "trade" | "farm"): readonly HeroStat[] {
  const health: HeroStat =
    data.health === null
      ? { label: "Health factor", value: "No debt", tone: "positive", weight: 1.25 }
      : {
          label: "Health factor",
          value: data.health.toFixed(2),
          badge: {
            text: healthLabel(data.health),
            tone: healthTone(data.health),
          },
          sub: `Liquidation at ${thresholds.liquidation.toFixed(2)}`,
          weight: 1.25,
        };
  // The bar is that room as a share of the account's value: full means far from liquidation.
  const room: HeroStat =
    data.health === null || data.roomBps === null
      ? {
          label: "Room before liquidation",
          value: data.health === null ? "—" : wholeUsd(data.roomBeforeLiquidation),
          weight: 1.6,
        }
      : {
          label: "Room before liquidation",
          value: wholeUsd(data.roomBeforeLiquidation),
          meter: { fill: data.roomBps / 10_000, tone: healthTone(data.health) },
          weight: 1.6,
        };
  const use = module === "trade" ? data.perps : data.farm;
  const share: HeroStat =
    use === null || data.collateral === 0n
      ? {
          label: module === "trade" ? "Margin trade" : "Farm",
          value: "—",
          weight: 0.95,
        }
      : {
          label: module === "trade" ? "Margin trade" : "Farm",
          value: formatPercent(Math.min(10_000, Number((use.value * 10_000n) / data.collateral)), 0),
          aside: wholeUsd(use.value),
          meter: {
            fill: Math.min(1, Number((use.value * 10_000n) / data.collateral) / 10_000),
          },
          weight: 0.95,
        };
  return [health, room, share];
}

// Trade and Farm open the same header, because they share one margin account and one health factor. The account's value is
// drawn as a ring of its two parts (the user's own net available collateral, solid; what was borrowed, faint), with the net
// leverage (value ÷ net available) inside it. The last figure says how much of the account this module uses.
// The screen wires the data: `<MarginHero module="trade" overview={useMarginOverview()} />`.
export function MarginHero({ module, overview }: { module: "trade" | "farm"; overview: Resource<MarginOverview> }) {
  if (overview.status !== "ready") {
    return <ModuleHeroPlaceholder label={LABEL} message={overview.status === "error" ? "Can't load your margin account" : undefined} />;
  }
  const data = overview.data;
  // No account yet: the same header with every figure at its empty value, so it reads as "not set up" rather than broken.
  if (!data.hasMarginAccount) {
    return (
      <ModuleHero
        label={LABEL}
        value={formatUsd(0n)}
        caption="No margin account yet"
        stats={[
          { label: "Health factor", value: "—", weight: 1.25 },
          { label: "Room before liquidation", value: "—", weight: 1.6 },
          { label: module === "trade" ? "Margin trade" : "Farm", value: "—", weight: 0.95 },
        ]}
      />
    );
  }

  return (
    <ModuleHero
      label={LABEL}
      value={formatUsd(data.collateral)}
      ring={{
        parts: [
          { label: "Net available", value: formatUsd(data.net) },
          { label: "Borrowed", value: formatUsd(data.borrowed) },
        ],
        firstShare: data.collateral > 0n ? Number((data.net * 10_000n) / data.collateral) / 10_000 : 1,
        center: data.leverage === null ? "1.00x" : `${data.leverage.toFixed(2)}x`,
        caption: "leverage",
      }}
      stats={marginStats(data, module)}
    />
  );
}
