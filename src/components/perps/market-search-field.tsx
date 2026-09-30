import { MagnifyingGlass } from "phosphor-react-native";
import { TextInput, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

type MarketSearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function MarketSearchField({ value, onChangeText }: MarketSearchFieldProps) {
  const { colors, fontFamily, fontSize, radius, spacing } = useTheme();

  return (
    <View
      style={{
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <MagnifyingGlass size={18} color={colors.textMuted} />
      <TextInput
        accessibilityLabel="Search markets"
        value={value}
        onChangeText={onChangeText}
        placeholder="Search markets"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ flex: 1, padding: 0, minHeight: 44, fontSize: fontSize.bodyLg, fontFamily: fontFamily.regular, color: colors.text }}
      />
    </View>
  );
}
