import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useTheme } from "@/theme/use-theme";

export type AppearanceValue = "system" | "light" | "dark";

type AppearanceCardProps = {
  value: AppearanceValue;
  onChange: (value: AppearanceValue) => void;
};

const segments = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export function AppearanceCard({ value, onChange }: AppearanceCardProps) {
  const { spacing } = useTheme();

  return (
    <Card style={{ gap: spacing.md }}>
      <AppText variant="body" strong color="textMuted">
        Appearance
      </AppText>
      <SegmentedControl segments={segments} value={value} onChange={onChange} />
    </Card>
  );
}
