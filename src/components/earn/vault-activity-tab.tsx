import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { formatFullAmount } from "@/format/format-earn";
import type { VaultDetail } from "@/types/earn";

import { ActivityRow } from "./activity-row";
import { FactCard } from "./fact-card";

type VaultActivityTabProps = {
  vault: VaultDetail;
  onOpenTransaction: (signature: string) => void;
};

// What this wallet supplied to and withdrew from the vault, as on the web app's Activity tab.
export function VaultActivityTab({ vault, onOpenTransaction }: VaultActivityTabProps) {
  if (vault.activity.length === 0) {
    return (
      <AppText variant="body" color="textMuted" style={{ marginTop: 16 }}>
        You have not supplied to or withdrawn from this vault yet.
      </AppText>
    );
  }

  return (
    <View style={{ marginTop: 12 }}>
      <FactCard>
        {vault.activity.map((event, index) => (
          <ActivityRow
            key={`${event.signature}-${event.kind}`}
            first={index === 0}
            icon={event.kind === "supply" ? "arrow_upward" : "arrow_downward"}
            tone="purple"
            title={event.kind === "supply" ? "Supplied" : "Withdrew"}
            detail={event.date}
            value={event.amount === null ? "—" : formatFullAmount(event.amount, vault.symbol)}
            signature={event.signature}
            onOpenTransaction={onOpenTransaction}
          />
        ))}
      </FactCard>
    </View>
  );
}
