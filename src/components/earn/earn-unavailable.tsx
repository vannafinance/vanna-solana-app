import { View } from "react-native";

import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { useTheme } from "@/theme/use-theme";
import type { Resource } from "@/types/resource";

type EarnUnavailableProps = {
  title: string;
  resource: Resource<unknown>;
  emptyLabel: string;
  onBack: () => void;
};

export function EarnUnavailable({ title, resource, emptyLabel, onBack }: EarnUnavailableProps) {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PlainHeader title={title} onBack={onBack} />
      <ResourceView resource={resource} emptyLabel={emptyLabel}>
        {() => null}
      </ResourceView>
    </View>
  );
}
