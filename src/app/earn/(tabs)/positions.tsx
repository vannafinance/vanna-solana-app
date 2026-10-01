import { router } from "expo-router";
import { View } from "react-native";

import { EarnEmptyCard } from "@/components/earn/earn-empty-card";
import { EarnPortfolioPanel } from "@/components/earn/earn-portfolio-panel";
import { EarnPositionCard } from "@/components/earn/earn-position-card";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useEarnPositions } from "@/hooks/use-earn-positions";
import { useHeaderProps } from "@/hooks/use-header-props";

export default function EarnPositionsScreen() {
  const headerProps = useHeaderProps();
  const portfolio = useEarnPositions();

  return (
    <Screen
      header={
        <SpaceHeader space="earn" {...headerProps}>
          <ResourceView resource={portfolio} emptyLabel="No supplied assets">
            {(data) => <EarnPortfolioPanel summary={data.summary} />}
          </ResourceView>
        </SpaceHeader>
      }
    >
      <ResourceView resource={portfolio} emptyLabel="No positions yet">
        {(data) =>
          data.positions.length === 0 ? (
            <EarnEmptyCard
              title="No supplied assets"
              message="Supply to a vault and your position shows up here."
              actionLabel="Browse vaults"
              onAction={() => router.navigate("/earn")}
            />
          ) : (
            <View style={{ gap: 12 }}>
              {data.positions.map((position) => (
                <EarnPositionCard
                  key={position.vaultId}
                  position={position}
                  onWithdraw={() => router.push(`/earn/withdraw/${position.vaultId}`)}
                  onSupplyMore={() => router.push(`/earn/supply/${position.vaultId}`)}
                />
              ))}
            </View>
          )
        }
      </ResourceView>
    </Screen>
  );
}
