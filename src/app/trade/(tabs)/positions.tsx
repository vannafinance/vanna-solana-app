import { router } from "expo-router";

import { ListScreen } from "@/components/perps/list-screen";
import { NewPositionButton } from "@/components/perps/new-position-button";
import { PerpsPortfolioHeader } from "@/components/perps/perps-portfolio-header";
import { PerpsPositionCard } from "@/components/perps/perps-position-card";
import { AppText } from "@/components/ui/app-text";
import { ResourceView } from "@/components/ui/resource-view";
import { useHeaderProps } from "@/hooks/use-header-props";
import { usePerpsPositions } from "@/hooks/use-perps-positions";

export default function PerpsPositionsScreen() {
  const headerProps = useHeaderProps();
  const portfolio = usePerpsPositions();

  return (
    <ResourceView resource={portfolio} emptyLabel="No margin account yet">
      {(data) => (
        <ListScreen
          data={data.positions}
          keyOf={(position) => position.id}
          header={
            <PerpsPortfolioHeader
              mode="current"
              portfolio={data}
              headerProps={{ onBack: router.back, ...headerProps }}
              onSelectMode={(mode) => mode === "history" && router.navigate("/trade/history")}
            />
          }
          footer={<NewPositionButton onPress={() => router.navigate("/trade")} />}
          empty={<AppText color="textMuted" style={{ textAlign: "center" }}>No open positions</AppText>}
          renderItem={(position) => (
            <PerpsPositionCard
              position={position}
              onAddCollateral={() => router.push(`/trade/add-collateral/${position.id}`)}
              onClose={() => router.push(`/trade/close/${position.id}`)}
            />
          )}
        />
      )}
    </ResourceView>
  );
}
