import { ClockCounterClockwise, Plant, Stack } from "phosphor-react-native";

import { ProductTabsLayout } from "@/components/navigation/product-tabs-layout";

const TABS = [
  { key: "index", label: "Deploy", icon: Plant },
  { key: "positions", label: "Position", icon: Stack },
  { key: "history", label: "History", icon: ClockCounterClockwise },
] as const;

export default function FarmTabsLayout() {
  return <ProductTabsLayout product="farm" tabs={TABS} />;
}
