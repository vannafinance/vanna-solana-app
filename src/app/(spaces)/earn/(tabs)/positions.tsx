import { router } from "expo-router";

import { EarnEmptyCard } from "@/components/earn/earn-empty-card";
import { EarnHero } from "@/components/earn/earn-hero";
import { EarnOverviewCard } from "@/components/earn/earn-overview-card";
import { EarnPositionCard } from "@/components/earn/earn-position-card";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useEarnOverview } from "@/hooks/use-earn-overview";
import { useEarnPositions } from "@/hooks/use-earn-positions";
import { useHeaderProps } from "@/hooks/use-header-props";

export default function EarnPositionsScreen() {
  const headerProps = useHeaderProps();
  const portfolio = useEarnPositions();
  const { overview, mode, setMode, range, setRange } = useEarnOverview(portfolio);

  return (
    <Screen
      gap={12}
      header={
        <SpaceHeader space="earn" {...headerProps}>
          <EarnHero portfolio={portfolio} />
        </SpaceHeader>
      }
    >
      <ResourceView resource={portfolio} emptyLabel="No positions yet">
        {(data) => (
          <>
            {data.positions.length === 0 ? null : <EarnOverviewCard overview={overview} mode={mode} onModeChange={setMode} range={range} onRangeChange={setRange} />}
            {data.positions.length === 0 ? (
              <EarnEmptyCard
                title="No supplied assets"
                message="Supply to a vault and your position shows up here."
                actionLabel="Browse vaults"
                onAction={() => router.navigate("/earn")}
              />
            ) : (
              data.positions.map((position) => (
                <EarnPositionCard
                  key={position.vaultId}
                  position={position}
                  onWithdraw={() => router.push(`/earn/withdraw/${position.vaultId}`)}
                  onSupplyMore={() => router.push(`/earn/supply/${position.vaultId}`)}
                />
              ))
            )}
          </>
        )}
      </ResourceView>
    </Screen>
  );
}
