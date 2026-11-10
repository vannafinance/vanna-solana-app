import { useLocalSearchParams } from "expo-router";

import { EventScreen } from "@/screens/predict/event";

// Predict market screen (design 'predict-market', sample id lal-bar-osa). Params: m = outcome, side = yes | no, act = sell.
export default function Market() {
  const { id, m, side, act } = useLocalSearchParams<{ id: string; m?: string; side?: string; act?: string }>();
  return <EventScreen id={id} m={m} side={side} act={act} />;
}
