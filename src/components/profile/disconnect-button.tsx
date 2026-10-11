import { Pressable } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type DisconnectButtonProps = {
  onPress: () => void;
  busy?: boolean;
};

export function DisconnectButton({ onPress, busy = false }: DisconnectButtonProps) {
  const { colors, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Disconnect wallet"
      onPress={onPress}
      disabled={busy}
      accessibilityState={{ disabled: busy, busy }}
      android_ripple={ripple(colors.negative)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Icon name="logout" size={18} color="negative" />
      <AppText variant="body" strong color="negative">
        {busy ? "Disconnecting" : "Disconnect wallet"}
      </AppText>
    </Pressable>
  );
}
