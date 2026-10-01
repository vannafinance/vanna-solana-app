import { SpaceTabsLayout } from "@/components/navigation/space-tabs-layout";

const TABS = [
  { key: "index", label: "Overview", icon: "home" },
  { key: "lender", label: "Lender", icon: "toll" },
  { key: "trader", label: "Trader", icon: "trending_up" },
] as const;

export default function HomeTabsLayout() {
  return <SpaceTabsLayout space="portfolio" tabs={TABS} />;
}
