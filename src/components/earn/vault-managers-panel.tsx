import { Card } from "@/components/ui/card";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail } from "@/types/earn";

import { EarnStatRow } from "./earn-stat-row";

type VaultManagersPanelProps = {
  vault: VaultDetail;
};

export function VaultManagersPanel({ vault }: VaultManagersPanelProps) {
  const { spacing } = useTheme();

  return (
    <Card style={{ paddingVertical: spacing.xs }}>
      {vault.managers.map((manager, index) => (
        <EarnStatRow key={manager.label} first={index === 0} label={manager.label} value={manager.value} />
      ))}
    </Card>
  );
}
