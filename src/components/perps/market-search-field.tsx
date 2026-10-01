import { TextInput, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/use-theme";

type MarketSearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
};

export function MarketSearchField({ value, onChangeText }: MarketSearchFieldProps) {
  const { colors, fontFamily, fontSize, radius, shadow } = useTheme();

  return (
    <View
      style={[
        {
          height: 48,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        shadow.card,
      ]}
    >
      <Icon name="search" size={18} color="textMuted" />
      <TextInput
        accessibilityLabel="Search markets"
        value={value}
        onChangeText={onChangeText}
        placeholder="Search markets"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={{ flex: 1, padding: 0, minHeight: 44, fontSize: fontSize.body, fontFamily: fontFamily.regular, color: colors.text }}
      />
    </View>
  );
}
