import type { TextStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import type { ThemeColor } from "@/theme/use-theme";

type CapsLabelProps = {
  children: string;
  color?: ThemeColor;
  style?: TextStyle;
};

export function CapsLabel({ children, color = "textMuted", style }: CapsLabelProps) {
  return (
    <AppText variant="caption" strong color={color} style={[{ letterSpacing: 0.5, textTransform: "uppercase" }, style]}>
      {children}
    </AppText>
  );
}
