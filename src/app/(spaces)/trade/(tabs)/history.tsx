import { MarginHero } from "@/components/margin/margin-hero";
import { ActivityList } from "@/components/perps/activity-list";
import { SpaceHeader } from "@/components/ui/space-header";
import { useExplorer } from "@/hooks/use-explorer";
import { useHeaderProps } from "@/hooks/use-header-props";
import { usePerpsActivity } from "@/hooks/use-perps-activity";
import { useMarginOverview } from "@/hooks/use-margin-overview";

// Margin trade activity of the margin account only. Wallet swaps are not margin activity; their history is on the Swap screen.
export default function TradeHistoryScreen() {
  const margin = useMarginOverview();
  const headerProps = useHeaderProps();
  const { openTransaction } = useExplorer();
  const activity = usePerpsActivity();

  const entries = activity.status === "ready" ? activity.data : [];
  const emptyLabel = activity.status === "loading" ? "Loading your history…" : activity.status === "error" ? "Your margin trade history is unavailable right now." : "No margin trades yet";

  return (
    <ActivityList
      header={
        <SpaceHeader space="trade" {...headerProps}>
          <MarginHero module="trade" overview={margin} />
        </SpaceHeader>
      }
      entries={entries}
      emptyLabel={emptyLabel}
      onOpenTransaction={openTransaction}
    />
  );
}
