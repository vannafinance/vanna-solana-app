import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ExplorerLink } from "@/components/ui/explorer-link";
import { Icon } from "@/components/ui/icon";
import { formatFullAmount } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { VaultDetail } from "@/types/earn";

import { FactCard } from "./fact-card";

type VaultActivityTabProps = {
  vault: VaultDetail;
  onOpenTransaction: (signature: string) => void;
};

// What this wallet supplied to and withdrew from the vault, as on the web app's Activity tab.
export function VaultActivityTab({ vault, onOpenTransaction }: VaultActivityTabProps) {
  const { colors } = useTheme();

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
          <View
            key={`${event.signature}-${event.kind}`}
            style={{ minHeight: 64, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: index === 0 ? 0 : 1, borderTopColor: colors.divider }}
          >
            <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.purpleTint }}>
              <Icon name={event.kind === "supply" ? "arrow_upward" : "arrow_downward"} size={18} color="onPurpleTint" bold />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="body" strong style={{ lineHeight: 20 }}>
                {event.amount === null
                  ? `${event.kind === "supply" ? "Supplied" : "Withdrew"} ${vault.symbol}`
                  : `${event.kind === "supply" ? "Supplied" : "Withdrew"} ${formatFullAmount(event.amount, vault.symbol)}`}
              </AppText>
              <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
                {event.date}
              </AppText>
            </View>
            <ExplorerLink signature={event.signature} onOpen={onOpenTransaction} />
          </View>
        ))}
      </FactCard>
    </View>
  );
}
