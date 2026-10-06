import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

import { DepositCard } from "@/components/farm/deposit-card";
import { deployCtaLabel } from "@/components/farm/farm-format";
import { PoolHeader } from "@/components/farm/farm-pool-card";
import { LeverageCard } from "@/components/farm/leverage-card";
import { StrategyPreviewCard } from "@/components/farm/strategy-preview-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlainHeader } from "@/components/ui/plain-header";
import { ResourceView } from "@/components/ui/resource-view";
import { ReviewSheet } from "@/components/ui/review-sheet";
import { Screen } from "@/components/ui/screen";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { isPoolSymbol, useFarmDeploy } from "@/hooks/use-farm-deploy";
import { MAX_LEVERAGE, MIN_LEVERAGE } from "@/lib/farm/farm-math";
import type { PoolSymbol } from "@/types/farm";

function FarmDeploy({ pool }: { pool: PoolSymbol }) {
  const deploy = useFarmDeploy(pool);
  const { screen } = deploy;
  const ready = screen.status === "ready" ? screen.data : null;

  return (
    <>
      <Screen
        gap={12}
        paddingTop={8}
        header={<PlainHeader title={`Farm into ${pool}`} onBack={router.back} />}
        footer={
          ready ? (
            <View style={{ paddingTop: 4, paddingBottom: 8 }}>
              <Button
                icon={ready.form.issue === null ? "account_balance_wallet" : undefined}
                disabled={ready.form.issue !== null}
                label={deployCtaLabel(ready.form, deploy.needsMarginAccount)}
                onPress={deploy.deploy}
              />
            </View>
          ) : undefined
        }
      >
        <ResourceView resource={screen} emptyLabel={deploy.needsWallet ? "Connect a wallet to farm" : `The ${pool} pool is not available right now`}>
          {({ form, preview }) => (
            <>
              <Card>
                <PoolHeader pool={form.pool} />
              </Card>
              <DepositCard
                form={form}
                onChangeAmount={deploy.setAmountText}
                onMax={deploy.fillMax}
                onSelectCollateral={deploy.selectCollateral}
                onStepCollateral={deploy.stepCollateral}
              />
              <LeverageCard leverage={form.leverage} minLeverage={MIN_LEVERAGE} maxLeverage={MAX_LEVERAGE} onChangeLeverage={deploy.setLeverage} />
              <StrategyPreviewCard preview={preview} pool={form.pool} />
            </>
          )}
        </ResourceView>
      </Screen>
      <ReviewSheet data={deploy.review.data} onConfirm={deploy.review.confirm} onCancel={deploy.review.cancel} />
      <TransactionSheet {...deploy.sheet} />
    </>
  );
}

// One pool's Deploy screen: the stock and leverage, a live preview of the strategy, then the review and the wallet.
export default function FarmDeployScreen() {
  const { pool } = useLocalSearchParams<{ pool: string }>();

  if (!isPoolSymbol(pool)) {
    return (
      <Screen header={<PlainHeader title="Farm" onBack={router.back} />}>
        <ResourceView resource={{ status: "empty" }} emptyLabel="This pool does not exist">
          {() => null}
        </ResourceView>
      </Screen>
    );
  }
  return <FarmDeploy pool={pool} />;
}
