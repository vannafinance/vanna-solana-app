import { ChartLineUp, ClockCounterClockwise, Stack } from "phosphor-react-native";

import { ProductTabsLayout } from "@/components/navigation/product-tabs-layout";

const tabs = [
  { key: "index", label: "Markets", icon: ChartLineUp },
  { key: "positions", label: "Positions", icon: Stack },
  { key: "history", label: "History", icon: ClockCounterClockwise },
] as const;

export default function PerpsTabsLayout() {
  return <ProductTabsLayout product="perps" tabs={tabs} />;
}
