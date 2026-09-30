import { CaretDown, CaretUp, Check } from "phosphor-react-native";
import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme/use-theme";

const sections = [
  {
    title: "Collateral requirement",
    points: [
      "All borrowed positions must remain fully collateralized.",
      "If collateral value falls below the liquidation threshold, your position may be liquidated.",
    ],
  },
  {
    title: "Borrow limits and leverage",
    points: [
      "You may only borrow assets up to the maximum loan-to-value allowed.",
      "Leverage is enabled only when collateral value supports it.",
    ],
  },
  {
    title: "Interest and fees",
    points: [
      "Interest rates are variable and accrue in real time.",
      "Additional protocol fees may apply for borrowing or liquidation events.",
    ],
  },
  {
    title: "Liquidation risk",
    points: [
      "Market volatility can reduce collateral value.",
      "If your health factor drops below safe limits, collateral may be partly or fully liquidated without prior notice.",
    ],
  },
  {
    title: "Your responsibility",
    points: [
      "You are responsible for monitoring your positions, balances and risks.",
      "Vanna is a decentralized protocol with inherent smart contract risks.",
    ],
  },
] as const;

type BorrowAgreementSheetProps = {
  visible: boolean;
  openSection: number | null;
  agreed: boolean;
  onToggleSection: (index: number) => void;
  onToggleAgreed: () => void;
  onClose: () => void;
  onSign: () => void;
};

export function BorrowAgreementSheet({ visible, openSection, agreed, onToggleSection, onToggleAgreed, onClose, onSign }: BorrowAgreementSheetProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <BottomSheet visible={visible} onDismiss={onClose}>
      <View style={{ gap: spacing.sm, marginBottom: spacing.md }}>
        <AppText variant="heading">Review and sign agreement</AppText>
        <AppText variant="bodyLg" color="textMuted">
          Please review the terms of borrowing on Vanna before you continue.
        </AppText>
      </View>
      <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
        {sections.map((section, index) => {
          const open = openSection === index;
          const Chevron = open ? CaretUp : CaretDown;
          return (
            <View key={section.title} style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={section.title}
                accessibilityState={{ expanded: open }}
                onPress={() => onToggleSection(index)}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 56 }}
              >
                <View style={{ width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
                  <AppText variant="label" strong style={{ color: colors.onPurpleTint }}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="bodyLg" strong style={{ flex: 1 }}>
                  {section.title}
                </AppText>
                <Chevron size={18} color={colors.textMuted} />
              </Pressable>
              {open ? (
                <View style={{ paddingLeft: 28 + spacing.md, paddingBottom: spacing.md, gap: 4 }}>
                  {section.points.map((point) => (
                    <View key={point} style={{ flexDirection: "row", gap: spacing.sm }}>
                      <AppText variant="body" color="textMuted">
                        •
                      </AppText>
                      <AppText variant="body" color="textMuted" style={{ flex: 1 }}>
                        {point}
                      </AppText>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: agreed }}
        accessibilityLabel="I have read and agree to the Vanna Borrow Agreement."
        onPress={onToggleAgreed}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          marginTop: spacing.md,
          padding: spacing.lg,
          minHeight: 64,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: spacing.sm,
            borderWidth: 2,
            borderColor: agreed ? colors.primary : colors.text,
            backgroundColor: agreed ? colors.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {agreed ? <Check size={16} color={colors.onPrimary} weight="bold" /> : null}
        </View>
        <AppText variant="bodyLg" style={{ flex: 1 }}>
          I have read and agree to the Vanna Borrow Agreement.
        </AppText>
      </Pressable>
      <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.md }}>
        <Button flex variant="outline" label="Close" onPress={onClose} />
        <Button flex label="Sign agreement" disabled={!agreed} onPress={onSign} />
      </View>
    </BottomSheet>
  );
}
