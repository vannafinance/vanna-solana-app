import { useLocalSearchParams } from "expo-router";

import { CloseSheet } from "@/components/farm/close-sheet";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ResourceView } from "@/components/ui/resource-view";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { useFarmClose } from "@/hooks/use-farm-close";

export default function FarmCloseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const farmClose = useFarmClose(id);

  return (
    <>
      {farmClose.close.status === "ready" ? (
        <CloseSheet
          visible={!farmClose.transacting}
          view={farmClose.close.data}
          onSelectFraction={farmClose.selectFraction}
          onConfirm={farmClose.confirm}
          onDismiss={farmClose.dismiss}
        />
      ) : (
        <BottomSheet visible={!farmClose.transacting} onDismiss={farmClose.dismiss}>
          <ResourceView resource={farmClose.close} emptyLabel="Position not found">
            {() => null}
          </ResourceView>
        </BottomSheet>
      )}
      <TransactionSheet {...farmClose.sheet} />
    </>
  );
}
