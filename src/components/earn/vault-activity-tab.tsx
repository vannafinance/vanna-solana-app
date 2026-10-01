import { View } from "react-native";

import { formatPercent } from "@/format/format-amount";
import { formatSummaryAmount } from "@/format/format-earn";
import type { VaultDetail, VaultEventKind } from "@/types/earn";

import { FactCard, FactRow, SectionTitle } from "./fact-card";

const EVENT_LABEL: Record<VaultEventKind, string> = {
  supply: "Supply",
  borrow: "Borrow",
  repay: "Repay",
  withdraw: "Withdraw",
};

export function VaultActivityTab({ vault }: { vault: VaultDetail }) {
  return (
    <View>
      <SectionTitle title="Supply distribution" marginTop={16} marginBottom={6} />
      <FactCard>
        <FactRow first label="Top 10 suppliers" value={formatSummaryAmount(vault.topSuppliers, vault.symbol)} detail={`${formatPercent(vault.topSuppliersShareBps, 1)} of supply`} />
        <FactRow
          label="Everyone else"
          value={formatSummaryAmount(vault.otherSuppliers, vault.symbol)}
          detail={`${formatPercent(10_000 - vault.topSuppliersShareBps, 1)} of supply`}
        />
      </FactCard>
      <SectionTitle title="Recent activity" marginTop={20} marginBottom={6} />
      <FactCard>
        {vault.activity.map((entry, index) => (
          <FactRow key={`${entry.kind}-${entry.when}`} first={index === 0} label={EVENT_LABEL[entry.kind]} value={formatSummaryAmount(entry.amount, vault.symbol)} detail={entry.when} />
        ))}
      </FactCard>
    </View>
  );
}
