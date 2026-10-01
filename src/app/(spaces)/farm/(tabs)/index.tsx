import { ScrollView, View } from "react-native";

import { DepositCard } from "@/components/farm/deposit-card";
import { DeployHero } from "@/components/farm/deploy-hero";
import { deployCtaLabel } from "@/components/farm/farm-format";
import { LeverageCard } from "@/components/farm/leverage-card";
import { YieldPoolCard } from "@/components/farm/yield-pool-card";
import { Button } from "@/components/ui/button";
import { ResourceView } from "@/components/ui/resource-view";
import { SpaceHeader } from "@/components/ui/space-header";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { useFarmDeploy } from "@/hooks/use-farm-deploy";
import { useHeaderProps } from "@/hooks/use-header-props";
import { MAX_LEVERAGE, MIN_LEVERAGE } from "@/lib/farm/farm-math";
import { useTheme } from "@/theme/use-theme";

export default function FarmDeployScreen() {
  const { colors } = useTheme();
  const headerProps = useHeaderProps();
  const deploy = useFarmDeploy();
  const { form } = deploy;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SpaceHeader space="farm" {...headerProps}>
          {form.status === "ready" ? <DeployHero form={form.data} /> : undefined}
        </SpaceHeader>
        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          <ResourceView resource={form} emptyLabel="No farm pools available">
            {(data) => (
              <>
                <YieldPoolCard pools={data.pools} selected={data.pool} onSelect={deploy.selectPool} />
                <DepositCard
                  form={data}
                  onChangeAmount={deploy.setAmountText}
                  onMax={deploy.fillMax}
                  onSelectCollateral={deploy.selectCollateral}
                  onStepCollateral={deploy.stepCollateral}
                />
                <LeverageCard form={data} minLeverage={MIN_LEVERAGE} maxLeverage={MAX_LEVERAGE} onChangeLeverage={deploy.setLeverage} />
                <Button
                  label={deployCtaLabel(data, deploy.needsMarginAccount)}
                  icon="account_balance_wallet"
                  disabled={data.issue !== null}
                  onPress={deploy.deploy}
                />
              </>
            )}
          </ResourceView>
        </View>
      </ScrollView>
      <TransactionSheet {...deploy.sheet} />
    </View>
  );
}
