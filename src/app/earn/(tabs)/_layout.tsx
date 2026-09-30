import { ClockCounterClockwise, Coins, HandCoins } from "phosphor-react-native";

import { ProductTabsLayout } from "@/components/navigation/product-tabs-layout";

const TABS = [
  { key: "index", label: "Vaults", icon: HandCoins },
  { key: "positions", label: "Positions", icon: Coins },
  { key: "history", label: "History", icon: ClockCounterClockwise },
] as const;

export default function EarnTabsLayout() {
  return <ProductTabsLayout product="earn" tabs={TABS} />;
}
