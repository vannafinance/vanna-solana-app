import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";

import { CapsLabel } from "./caps-label";
import { LeverageSlider } from "./leverage-slider";

type LeverageCardProps = {
  leverage: number;
  minLeverage: number;
  maxLeverage: number;
  onChangeLeverage: (value: number) => void;
};

// The borrow it leads to is shown in the strategy preview below, so this card is only the choice.
export function LeverageCard({ leverage, minLeverage, maxLeverage, onChangeLeverage }: LeverageCardProps) {
  return (
    <Card padded={false} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
      <View style={{ height: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <CapsLabel>LEVERAGE</CapsLabel>
        <AppText variant="body" strong color="link">
          {`${leverage}x`}
        </AppText>
      </View>
      <LeverageSlider value={leverage} min={minLeverage} max={maxLeverage} onChange={onChangeLeverage} />
    </Card>
  );
}
