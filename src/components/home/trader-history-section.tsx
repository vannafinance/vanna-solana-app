import { View } from "react-native";

import { ActivityCard } from "@/components/perps/activity-card";
import { Button } from "@/components/ui/button";
import { ResourceView } from "@/components/ui/resource-view";
import { useTheme } from "@/theme/use-theme";
import type { MarginActivity } from "@/types/margin-history";
import type { Resource } from "@/types/resource";

import { EmptyCard } from "./empty-card";

export type HistoryFilter = "all" | "perp" | "farm";

type TraderHistorySectionProps = {
  activity: Resource<MarginActivity[]>;
  filter: HistoryFilter;
  onOpenTransaction: (signature: string) => void;
  onSeeAll: () => void;
};

// The latest entries only; the full list lives on the Trade tab, which is built for a long list.
const LATEST = 20;

function matches(entry: MarginActivity, filter: HistoryFilter) {
  return filter === "all" || (filter === "farm") === (entry.strategy === "farm");
}

// Each transaction of the margin account, as on the web app's Trader history: what moved, not a profit figure.
export function TraderHistorySection({ activity, filter, onOpenTransaction, onSeeAll }: TraderHistorySectionProps) {
  const { spacing } = useTheme();

  return (
    <ResourceView resource={activity} emptyLabel="No trading activity yet">
      {(entries) => {
        const visible = entries.filter((entry) => matches(entry, filter));
        if (visible.length === 0) return <EmptyCard title="No activity here" message="Transactions from your positions show up here." />;
        return (
          <View style={{ gap: spacing.md }}>
            {visible.slice(0, LATEST).map((entry) => (
              <ActivityCard key={entry.signature} entry={entry} onOpenTransaction={onOpenTransaction} />
            ))}
            {visible.length > LATEST ? <Button size="md" variant="outline" label="See all history" onPress={onSeeAll} /> : null}
          </View>
        );
      }}
    </ResourceView>
  );
}
