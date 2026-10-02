import { useLocalSearchParams } from "expo-router";

import { AddCollateralForm } from "@/components/perps/add-collateral-form";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ResourceView } from "@/components/ui/resource-view";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { COLLATERAL_PRESETS, usePerpsAddCollateral } from "@/hooks/use-perps-add-collateral";

export default function AddCollateralScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const add = usePerpsAddCollateral(id);

  return (
    <>
      <BottomSheet visible={add.flow.state === null} onDismiss={add.dismiss}>
        <ResourceView resource={add.ticket} emptyLabel="Position not found">
          {({ position, account, quote, insufficient }) => (
            <AddCollateralForm
              position={position}
              account={account}
              quote={quote}
              presets={COLLATERAL_PRESETS}
              insufficient={insufficient}
              onSelectAmount={add.setAmount}
              onSubmit={add.submit}
              onDismiss={add.dismiss}
            />
          )}
        </ResourceView>
      </BottomSheet>
      <TransactionSheet state={add.flow.state} onPrimary={add.onSheetPrimary} onClose={add.onSheetClose} onExplorer={add.flow.openExplorer} />
    </>
  );
}
