import { Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/use-theme";

type DeveloperControlsProps = {
  offline: boolean;
  onOffline: (offline: boolean) => void;
};

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, gap: spacing.md }}>
      <AppText variant="bodyLg" style={{ flex: 1 }}>
        {label}
      </AppText>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.disabled, true: colors.primary }}
        thumbColor={colors.onPrimary}
      />
    </View>
  );
}

export function DeveloperControls(props: DeveloperControlsProps) {
  const { spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.md }}>
      <View>
        <AppText variant="body" strong color="textMuted">
          Developer
        </AppText>
        <AppText variant="caption" color="textMuted">
          Switches for demoing states that are hard to reach. Not shown in release builds.
        </AppText>
      </View>
      <ToggleRow label="Simulate offline" value={props.offline} onChange={props.onOffline} />
    </Card>
  );
}
