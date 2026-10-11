import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

export function FactCard({ children }: { children: ReactNode }) {
  return (
    <Card padded={false} style={{ paddingVertical: 4, paddingHorizontal: 16 }}>
      {children}
    </Card>
  );
}

type FactRowProps = {
  label: string;
  value: string;
  detail?: string;
  valueColor?: ThemeColor;
  first?: boolean;
};

export function FactRow({ label, value, detail, valueColor = "text", first = false }: FactRowProps) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        minHeight: 52,
        paddingVertical: 8,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <View style={{ flexShrink: 1, alignItems: "flex-end" }}>
        <AppText variant="body" strong color={valueColor} style={{ textAlign: "right" }}>
          {value}
        </AppText>
        {detail ? (
          <AppText variant="caption" color="textMuted" style={{ lineHeight: 16, textAlign: "right" }}>
            {detail}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function SectionTitle({ title, marginTop, marginBottom }: { title: string; marginTop: number; marginBottom: number }) {
  return (
    <AppText variant="body" strong accessibilityRole="header" style={{ marginTop, marginBottom }}>
      {title}
    </AppText>
  );
}
