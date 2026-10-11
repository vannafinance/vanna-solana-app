import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { TokenIcon } from "@/components/ui/token-icon";
import { useTheme } from "@/theme/use-theme";

type SettingsCardProps = {
  network: string;
  onDocs: () => void;
  onSupport: () => void;
};

export function SettingsCard({ network, onDocs, onSupport }: SettingsCardProps) {
  const { colors, spacing } = useTheme();
  const links = [
    { label: "Docs and guides", onPress: onDocs },
    { label: "Support", onPress: onSupport },
  ];

  return (
    <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <AppText variant="body" color="textMuted">
          Network
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <TokenIcon symbol="SOL" size={20} />
          <AppText variant="body" strong>
            {network}
          </AppText>
        </View>
      </View>
      {links.map((link) => (
        <Pressable
          key={link.label}
          accessibilityRole="link"
          accessibilityLabel={link.label}
          onPress={link.onPress}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            height: 56,
            borderTopWidth: 1,
            borderTopColor: colors.divider,
          }}
        >
          <AppText variant="body" color="textMuted">
            {link.label}
          </AppText>
          <Icon name="arrow_outward" size={16} color="textMuted" />
        </Pressable>
      ))}
    </Card>
  );
}
