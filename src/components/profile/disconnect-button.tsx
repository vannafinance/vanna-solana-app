import { SignOut } from "phosphor-react-native";
import { Pressable } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type DisconnectButtonProps = {
  onPress: () => void;
  busy?: boolean;
};

export function DisconnectButton({ onPress, busy = false }: DisconnectButtonProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Disconnect wallet"
      onPress={onPress}
      disabled={busy}
      accessibilityState={{ disabled: busy, busy }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: spacing.sm,
        minHeight: 52,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <SignOut size={18} color={colors.negative} />
      <AppText variant="body" strong color="negative">
        {busy ? "Disconnecting" : "Disconnect wallet"}
      </AppText>
    </Pressable>
  );
}
