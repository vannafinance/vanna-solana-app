import { EarnHistoryGroups } from "@/components/earn/earn-history-groups";
import { EarnPortfolioPanel } from "@/components/earn/earn-portfolio-panel";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useEarnHistory } from "@/hooks/use-earn-history";
import { useExplorer } from "@/hooks/use-explorer";
import { useEarnPositions } from "@/hooks/use-earn-positions";
import { useHeaderProps } from "@/hooks/use-header-props";

export default function EarnHistoryScreen() {
  const headerProps = useHeaderProps();
  const portfolio = useEarnPositions();
  const history = useEarnHistory();
  const explorer = useExplorer();

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
      <ResourceView resource={history} emptyLabel="No activity yet">
        {(groups) => <EarnHistoryGroups groups={groups} onOpenTransaction={explorer.openTransaction} />}
      </ResourceView>
    </Screen>
  );
}
