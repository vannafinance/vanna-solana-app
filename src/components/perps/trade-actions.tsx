import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/theme/use-theme";

type TradeActionsProps = {
  onLong: () => void;
  onShort: () => void;
};

export function TradeActions({ onLong, onShort }: TradeActionsProps) {
  const { spacing } = useTheme();

  return (
    <View style={{ flexDirection: "row", gap: spacing.md }}>
      <Button flex label="Long" onPress={onLong} />
      <Button flex label="Short" variant="danger" onPress={onShort} />
    </View>
  );
}
