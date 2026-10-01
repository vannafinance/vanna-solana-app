import { SpaceTabsLayout } from "@/components/navigation/space-tabs-layout";

const TABS = [
  { key: "index", label: "Vaults", icon: "savings" },
  { key: "positions", label: "Positions", icon: "toll" },
  { key: "history", label: "History", icon: "history" },
] as const;

export default function EarnTabsLayout() {
  return <SpaceTabsLayout space="earn" tabs={TABS} />;
}
