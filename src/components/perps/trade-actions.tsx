import { View } from "react-native";

import { Button } from "@/components/ui/button";

type TradeActionsProps = {
  onLong: () => void;
  onShort: () => void;
};

export function TradeActions({ onLong, onShort }: TradeActionsProps) {
  return (
    <View style={{ flexDirection: "row", gap: 10, paddingTop: 4, paddingBottom: 12 }}>
      <Button flex label="Long" icon="trending_up" onPress={onLong} />
      <Button flex label="Short" icon="trending_down" variant="danger" onPress={onShort} />
    </View>
  );
}
