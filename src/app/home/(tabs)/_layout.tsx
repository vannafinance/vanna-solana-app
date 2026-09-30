import { ChartLineUp, Coins, House } from "phosphor-react-native";

import { ProductTabsLayout } from "@/components/navigation/product-tabs-layout";

const tabs = [
  { key: "index", label: "Overview", icon: House },
  { key: "lender", label: "Lender", icon: Coins },
  { key: "trader", label: "Trader", icon: ChartLineUp },
] as const;

export default function HomeTabsLayout() {
  return <ProductTabsLayout product="home" tabs={tabs} />;
}
