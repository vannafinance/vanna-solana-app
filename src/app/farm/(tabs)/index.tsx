import { Plant, Wallet } from "phosphor-react-native";
import { router } from "expo-router";

import { CollateralCard } from "@/components/farm/collateral-card";
import { FarmHero } from "@/components/farm/farm-hero";
import { deployCtaLabel, formatHealth, formatYearlyProfit } from "@/components/farm/farm-format";
import { GradientButton } from "@/components/farm/gradient-button";
import { LeverageCard } from "@/components/farm/leverage-card";
import { PoolCard } from "@/components/farm/pool-card";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { useFarmDeploy } from "@/hooks/use-farm-deploy";
import { useHeaderProps } from "@/hooks/use-header-props";
import { MAX_LEVERAGE, MIN_LEVERAGE } from "@/lib/farm/farm-math";

export default function FarmDeployScreen() {
  const headerProps = useHeaderProps();
  const deploy = useFarmDeploy();
  const { form } = deploy;

  return (
    <>
      <Screen
        header={
          <ProductHeader product="farm" title="Farm" icon={Plant} onBack={() => router.back()} {...headerProps}>
            {form.status === "ready" ? (
              <FarmHero
                label="Projected net profit"
                value={formatYearlyProfit(form.data.quote.projectedYearlyUsd)}
                stats={[
                  { label: "Health factor", value: formatHealth(form.data.quote.healthFactor ?? Number.POSITIVE_INFINITY) },
                  { label: "Leverage", value: `${form.data.leverage.toFixed(1)}x` },
                ]}
              />
            ) : null}
          </ProductHeader>
        }
      >
        <ResourceView resource={form} emptyLabel="No farm pools available">
          {(data) => (
            <>
              <PoolCard pools={data.pools} selected={data.pool} onSelect={deploy.selectPool} />
              <CollateralCard
                form={data}
                onChangeAmount={deploy.setAmountText}
                onMax={deploy.fillMax}
                onSelectCollateral={deploy.selectCollateral}
              />
              <LeverageCard form={data} minLeverage={MIN_LEVERAGE} maxLeverage={MAX_LEVERAGE} onChangeLeverage={deploy.setLeverage} />
              <GradientButton
                label={deployCtaLabel(data, deploy.needsMarginAccount)}
                icon={Wallet}
                disabled={data.issue !== null}
                onPress={deploy.deploy}
              />
            </>
          )}
        </ResourceView>
      </Screen>
      <TransactionSheet {...deploy.sheet} />
    </>
  );
}
