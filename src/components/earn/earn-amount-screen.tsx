import { ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DetailRow } from "@/components/ui/detail-row";
import { Icon } from "@/components/ui/icon";
import { PlainHeader } from "@/components/ui/plain-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TokenPill } from "@/components/ui/token-pill";
import { ReviewSheet } from "@/components/ui/review-sheet";
import { TransactionSheet } from "@/components/ui/transaction-sheet";
import { useTheme } from "@/theme/use-theme";
import type { EarnAsset } from "@/types/earn";
import type { ReviewData } from "@/types/review";
import type { TransactionState } from "@/types/transaction";

import type { AmountFormMode, AmountFormView } from "./present-amount-form";

const MODES = [
  { value: "supply", label: "Supply" },
  { value: "withdraw", label: "Withdraw" },
] as const;

type QuickFill = { label: string; fraction: number; selected: boolean };

type EarnAmountScreenProps = {
  view: AmountFormView;
  symbol: EarnAsset;
  value: string;
  fills: readonly QuickFill[];
  onChangeText: (value: string) => void;
  onQuickFill: (fraction: number) => void;
  onModeChange: (mode: AmountFormMode) => void;
  onSubmit: () => void;
  review: { data: ReviewData | null; confirm: () => void; cancel: () => void };
  onBack: () => void;
  transaction: TransactionState | null;
  onTransactionPrimary: () => void;
  onTransactionClose: () => void;
  onTransactionExplorer?: () => void;
  onViewPositions: () => void;
};

export function EarnAmountScreen({
  view,
  symbol,
  value,
  fills,
  onChangeText,
  onQuickFill,
  onModeChange,
  onSubmit,
  review,
  onBack,
  transaction,
  onTransactionPrimary,
  onTransactionClose,
  onTransactionExplorer,
  onViewPositions,
}: EarnAmountScreenProps) {
  const { colors, fontFamily } = useTheme();
  const insets = useSafeAreaInsets();
  const succeeded = transaction?.phase === "success";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <PlainHeader title={view.title} onBack={onBack} />
        <View style={{ paddingTop: 8, paddingHorizontal: 16, gap: 12 }}>
          <SegmentedControl segments={MODES} value={view.mode} onChange={onModeChange} />
          <Card>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
                {view.label}
              </AppText>
              <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
                {view.caption}
              </AppText>
            </View>
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <TextInput
                accessibilityLabel={view.label}
                value={value}
                onChangeText={onChangeText}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
                style={{ flex: 1, padding: 0, fontSize: 32, lineHeight: 40, fontFamily: fontFamily.semibold, color: view.over ? colors.negative : colors.text }}
              />
              <TokenPill symbol={symbol} />
            </View>
            <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
              {fills.map((fill) => (
                <Chip key={fill.label} flex size="sm" label={fill.label} selected={fill.selected} onPress={() => onQuickFill(fill.fraction)} />
              ))}
            </View>
          </Card>
          <Card padded={false} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
            {view.rows.map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
            <View style={{ paddingVertical: 12, flexDirection: "row", gap: 8 }}>
              <Icon name="info" size={16} color="textMuted" />
              <AppText variant="caption" color="textMuted" style={{ flex: 1, lineHeight: 16 }}>
                {view.note}
              </AppText>
            </View>
          </Card>
        </View>
      </ScrollView>
      <View style={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 12, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.divider }}>
        <Button label={view.cta.label} icon="account_balance_wallet" disabled={view.cta.disabled} onPress={onSubmit} />
      </View>
      <ReviewSheet data={review.data} onConfirm={review.confirm} onCancel={review.cancel} />
      <TransactionSheet
        state={transaction}
        primaryLabel={succeeded ? "View my positions" : undefined}
        onPrimary={() => {
          onTransactionPrimary();
          if (succeeded) onViewPositions();
        }}
        onClose={onTransactionClose}
        onExplorer={onTransactionExplorer}
      />
    </View>
  );
}
