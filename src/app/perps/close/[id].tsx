import { useLocalSearchParams } from "expo-router";

import { ClosePositionForm } from "@/components/perps/close-position-form";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ResourceView } from "@/components/ui/resource-view";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { CLOSE_FRACTIONS_BPS, usePerpsClose } from "@/hooks/use-perps-close";

export default function ClosePositionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const close = usePerpsClose(id);

  return (
    <>
      <BottomSheet visible={close.flow.state === null} onDismiss={close.dismiss}>
        <ResourceView resource={close.ticket} emptyLabel="Position not found">
          {({ position, quote }) => (
            <ClosePositionForm
              position={position}
              quote={quote}
              fractionsBps={CLOSE_FRACTIONS_BPS}
              onSelectFraction={close.setFractionBps}
              onSubmit={close.submit}
              onDismiss={close.dismiss}
            />
          )}
        </ResourceView>
      </BottomSheet>
      <TransactionSheet state={close.flow.state} onPrimary={close.onSheetPrimary} onClose={close.onSheetClose} />
    </>
  );
}
