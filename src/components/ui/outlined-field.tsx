import { TextInput, View, type KeyboardTypeOptions } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";

type OutlinedFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  suffix?: string;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  error?: boolean;
  backdrop?: string;
};

export function OutlinedField({ label, value, onChangeText, suffix, keyboardType = "decimal-pad", editable = true, error = false, backdrop }: OutlinedFieldProps) {
  const { colors, fontFamily, radius } = useTheme();

  return (
    <View
      style={{
        height: 56,
        marginTop: 9,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: radius.xs,
        borderWidth: 1,
        borderColor: error ? colors.negative : colors.border,
        opacity: editable ? 1 : 0.5,
      }}
    >
      <AppText
        variant="caption"
        color={error ? "negative" : "textMuted"}
        style={{ position: "absolute", left: 12, top: -9, paddingHorizontal: 4, lineHeight: 16, backgroundColor: backdrop ?? colors.surface }}
      >
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textMuted}
        style={{ flex: 1, padding: 0, fontSize: 16, fontFamily: fontFamily.semibold, color: colors.text }}
      />
      {suffix ? (
        <AppText variant="bodyLg" color="textMuted">
          {suffix}
        </AppText>
      ) : null}
    </View>
  );
}
