import { router } from "expo-router";

import { PerpsHistoryList } from "@/components/perps/perps-history-list";
import { PerpsPortfolioHeader } from "@/components/perps/perps-portfolio-header";
import { AppText } from "@/components/ui/app-text";
import { ResourceView } from "@/components/ui/resource-view";
import { useHeaderProps } from "@/hooks/use-header-props";
import { usePerpsPositions } from "@/hooks/use-perps-positions";
import { routes } from "@/navigation/routes";

export default function PerpsHistoryScreen() {
  const headerProps = useHeaderProps();
  const portfolio = usePerpsPositions();

  return (
    <ResourceView resource={portfolio} emptyLabel="No margin account yet">
      {(data) => (
        <PerpsHistoryList
          closed={data.closed}
          realizedPnl={data.realizedPnl}
          winRateBps={data.winRateBps}
          empty={<AppText color="textMuted" style={{ textAlign: "center" }}>No closed positions yet</AppText>}
          header={
            <PerpsPortfolioHeader
              mode="history"
              portfolio={data}
              headerProps={{ onBack: router.back, ...headerProps }}
              onSelectMode={(mode) => mode === "current" && router.navigate(routes.perpsPositions)}
            />
          }
        />
      )}
    </ResourceView>
  );
}
