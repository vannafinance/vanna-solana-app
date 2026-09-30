import { router } from "expo-router";
import { HandCoins } from "phosphor-react-native";
import { View } from "react-native";

import { EarnOverviewPanel } from "@/components/earn/earn-overview-panel";
import { EarnVaultList } from "@/components/earn/earn-vault-list";
import { PoolFilterRow } from "@/components/earn/pool-filter-row";
import { ProductHeader } from "@/components/ui/product-header";
import { useEarnVaults } from "@/hooks/use-earn-vaults";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useTheme } from "@/theme/use-theme";

export default function EarnVaultsScreen() {
  const { colors } = useTheme();
  const headerProps = useHeaderProps();
  const { overview, mode, setMode, range, setRange, filter, setFilter, filterOptions, vaults } = useEarnVaults();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <EarnVaultList
        vaults={vaults}
        emptyLabel="No vaults in this pool"
        onSelect={(id) => router.push(`/earn/vault/${id}`)}
        header={
          <>
            <ProductHeader product="earn" icon={HandCoins} title="Earn" onBack={() => router.back()} {...headerProps}>
              <EarnOverviewPanel overview={overview} mode={mode} onModeChange={setMode} range={range} onRangeChange={setRange} />
            </ProductHeader>
            <PoolFilterRow options={filterOptions} value={filter} onChange={setFilter} />
          </>
        }
      />
    </View>
  );
}
