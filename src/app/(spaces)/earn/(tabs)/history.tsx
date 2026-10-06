import { EarnHero } from "@/components/earn/earn-hero";
import { EarnHistoryGroups } from "@/components/earn/earn-history-groups";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useEarnHistory } from "@/hooks/use-earn-history";
import { useEarnPositions } from "@/hooks/use-earn-positions";
import { useExplorer } from "@/hooks/use-explorer";
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
          <EarnHero portfolio={portfolio} />
        </SpaceHeader>
      }
    >
      <ResourceView resource={history} emptyLabel="No activity yet">
        {(groups) => <EarnHistoryGroups groups={groups} onOpenTransaction={explorer.openTransaction} />}
      </ResourceView>
    </Screen>
  );
}
