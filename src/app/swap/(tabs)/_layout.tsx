import { ArrowsLeftRight, ClockCounterClockwise } from "phosphor-react-native";

import { ProductTabsLayout } from "@/components/navigation/product-tabs-layout";

const tabs = [
  { key: "index", label: "Swap", icon: ArrowsLeftRight },
  { key: "history", label: "History", icon: ClockCounterClockwise },
] as const;

export default function SwapTabsLayout() {
  return <ProductTabsLayout product="swap" tabs={tabs} />;
}
