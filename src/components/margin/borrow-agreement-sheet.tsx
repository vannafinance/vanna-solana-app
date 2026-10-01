import { Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
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

const BADGE = 24;
const ROW_GAP = 10;

export function BorrowAgreementSheet({ visible, openSection, agreed, onToggleSection, onToggleAgreed, onClose, onSign }: BorrowAgreementSheetProps) {
  const { colors, radius } = useTheme();

  return (
    <BottomSheet visible={visible} onDismiss={onClose}>
      <AppText variant="heading" accessibilityRole="header" style={{ marginTop: 4, marginBottom: 12 }}>
        Review and sign agreement
      </AppText>
      <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
        {sections.map((section, index) => {
          const open = openSection === index;
          return (
            <View key={section.title} style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={section.title}
                accessibilityState={{ expanded: open }}
                android_ripple={ripple(colors.text)}
                onPress={() => onToggleSection(index)}
                style={{ height: 48, flexDirection: "row", alignItems: "center", gap: ROW_GAP }}
              >
                <View style={{ width: BADGE, height: BADGE, borderRadius: radius.pill, backgroundColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
                  <AppText variant="caption" style={{ color: colors.onPurpleTint }}>
                    {index + 1}
                  </AppText>
                </View>
                <AppText variant="body" strong style={{ flex: 1 }}>
                  {section.title}
                </AppText>
                <Icon name="keyboard_arrow_down" size={14} color="textMuted" rotate={open ? 180 : undefined} />
              </Pressable>
              {open ? (
                <View style={{ paddingLeft: BADGE + ROW_GAP * 2 + 4, marginBottom: 12 }}>
                  {section.points.map((point) => (
                    <View key={point} style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
                      <AppText variant="caption" color="textMuted" style={{ lineHeight: 18 }}>
                        •
                      </AppText>
                      <AppText variant="caption" color="textMuted" style={{ flex: 1, lineHeight: 18 }}>
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
        android_ripple={ripple(colors.text)}
        onPress={onToggleAgreed}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginTop: 8,
          padding: 12,
          minHeight: 52,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: agreed ? colors.primary : colors.border,
          backgroundColor: agreed ? colors.purpleTint : "transparent",
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.chip,
            borderWidth: 2,
            borderColor: agreed ? colors.primary : colors.textMuted,
            backgroundColor: agreed ? colors.primary : "transparent",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {agreed ? <Icon name="check" size={14} color="onPrimary" bold /> : null}
        </View>
        <AppText variant="body" style={{ flex: 1 }}>
          I have read and agree to the Vanna Borrow Agreement.
        </AppText>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <Button flex size="md" variant="outline" label="Close" onPress={onClose} />
        <Button flex size="md" label="Sign agreement" disabled={!agreed} onPress={onSign} />
      </View>
    </BottomSheet>
  );
}
