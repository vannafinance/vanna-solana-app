import { SpaceTabsLayout } from "@/components/navigation/space-tabs-layout";

const TABS = [
  { key: "index", label: "Markets", icon: "show_chart" },
  { key: "swap", label: "Swap", icon: "swap_horiz" },
  { key: "positions", label: "Positions", icon: "layers" },
  { key: "history", label: "History", icon: "history" },
] as const;

export default function TradeTabsLayout() {
  return <SpaceTabsLayout space="trade" tabs={TABS} />;
}
