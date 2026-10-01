import { Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useTheme } from "@/theme/use-theme";

export type OutcomeValue = "success" | "network" | "rejected" | "no-fee" | "price-moved" | "expired";

type DeveloperControlsProps = {
  outcome: OutcomeValue;
  onOutcome: (outcome: OutcomeValue) => void;
  marginReset: boolean;
  onMarginReset: (reset: boolean) => void;
  offline: boolean;
  onOffline: (offline: boolean) => void;
};

const outcomes: readonly { value: OutcomeValue; label: string }[] = [
  { value: "success", label: "Success" },
  { value: "network", label: "Network error" },
  { value: "rejected", label: "Cancelled" },
  { value: "no-fee", label: "No SOL for fees" },
  { value: "price-moved", label: "Price moved" },
  { value: "expired", label: "Expired" },
];

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
          Preview switches for demoing every state. Not shown in release builds.
        </AppText>
      </View>
      <AppText variant="label" strong>
        Next approval result
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {outcomes.map((option) => (
          <Chip key={option.value} label={option.label} selected={props.outcome === option.value} onPress={() => props.onOutcome(option.value)} />
        ))}
      </View>
      <ToggleRow label="Reset margin account" value={props.marginReset} onChange={props.onMarginReset} />
      <ToggleRow label="Simulate offline" value={props.offline} onChange={props.onOffline} />
    </Card>
  );
}
