import { router } from "expo-router";
import { View } from "react-native";

import { EarnOverviewPanel } from "@/components/earn/earn-overview-panel";
import { EarnVaultList } from "@/components/earn/earn-vault-list";
import { PoolMenu } from "@/components/earn/pool-menu";
import { Screen } from "@/components/ui/screen";
import { SpaceHeader } from "@/components/ui/space-header";
import { useEarnVaults } from "@/hooks/use-earn-vaults";
import { useHeaderProps } from "@/hooks/use-header-props";

export default function EarnVaultsScreen() {
  const headerProps = useHeaderProps();
  const { overview, mode, setMode, range, setRange, filter, setFilter, filterOptions, vaults } = useEarnVaults();

  return (
    <Screen
      header={
        <SpaceHeader space="earn" {...headerProps}>
          <EarnOverviewPanel overview={overview} mode={mode} onModeChange={setMode} range={range} onRangeChange={setRange} />
        </SpaceHeader>
      }
    >
      <View style={{ gap: 12 }}>
        <View style={{ alignItems: "flex-start" }}>
          <PoolMenu options={filterOptions} value={filter} onChange={setFilter} />
        </View>
        <EarnVaultList vaults={vaults} emptyLabel="No vaults in this pool" onSelect={(id) => router.push(`/earn/vault/${id}`)} />
      </View>
    </Screen>
  );
}
