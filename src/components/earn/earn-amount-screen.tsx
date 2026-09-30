import { Wallet } from "phosphor-react-native";

import { AmountField } from "@/components/ui/amount-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { Notice } from "@/components/ui/notice";
import { PlainHeader } from "@/components/ui/plain-header";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TokenPill } from "@/components/ui/token-pill";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { useTheme } from "@/theme/use-theme";
import type { EarnAsset } from "@/types/earn";
import type { TransactionState } from "@/types/transaction";

import { type AmountFormMode, type AmountFormView } from "./present-amount-form";

const QUICK_FILLS = [
  { label: "25%", fraction: 0.25 },
  { label: "50%", fraction: 0.5 },
  { label: "Max", fraction: 1 },
] as const;

const MODES = [
  { value: "supply", label: "Supply" },
  { value: "withdraw", label: "Withdraw" },
] as const;

type EarnAmountScreenProps = {
  view: AmountFormView;
  symbol: EarnAsset;
  value: string;
  onChangeText: (value: string) => void;
  onQuickFill: (fraction: number) => void;
  onModeChange: (mode: AmountFormMode) => void;
  onSubmit: () => void;
  onBack: () => void;
  transaction: TransactionState | null;
  onTransactionPrimary: () => void;
  onTransactionClose: () => void;
  onViewPositions: () => void;
};

export function EarnAmountScreen({
  view,
  symbol,
  value,
  onChangeText,
  onQuickFill,
  onModeChange,
  onSubmit,
  onBack,
  transaction,
  onTransactionPrimary,
  onTransactionClose,
  onViewPositions,
}: EarnAmountScreenProps) {
  const { spacing } = useTheme();
  const succeeded = transaction?.phase === "success";

  return (
    <>
      <Screen
        header={<PlainHeader title={view.title} onBack={onBack} />}
        footer={<Button label={view.cta.label} icon={Wallet} disabled={view.cta.disabled} onPress={onSubmit} />}
      >
        <SegmentedControl segments={MODES} value={view.mode} onChange={onModeChange} />
        <Card>
          <AmountField
            label={view.label}
            caption={view.caption}
            value={value}
            onChangeText={onChangeText}
            tokenSlot={<TokenPill symbol={symbol} />}
            quickFills={QUICK_FILLS}
            onQuickFill={onQuickFill}
            error={view.error}
          />
        </Card>
        <Card style={{ paddingVertical: spacing.xs }}>
          {view.rows.map((row) => (
            <DetailRow key={row.label} label={row.label} value={row.value} />
          ))}
          <Notice message={view.note} />
        </Card>
      </Screen>
      <TransactionSheet
        state={transaction}
        primaryLabel={succeeded ? "View my positions" : undefined}
        onPrimary={() => {
          onTransactionPrimary();
          if (succeeded) onViewPositions();
        }}
        onClose={onTransactionClose}
      />
    </>
  );
}
