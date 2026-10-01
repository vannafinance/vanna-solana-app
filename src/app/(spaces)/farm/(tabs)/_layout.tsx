import { SpaceTabsLayout } from "@/components/navigation/space-tabs-layout";

const TABS = [
  { key: "index", label: "Deploy", icon: "eco" },
  { key: "positions", label: "Positions", icon: "layers" },
  { key: "history", label: "History", icon: "history" },
] as const;

export default function FarmTabsLayout() {
  return <SpaceTabsLayout space="farm" tabs={TABS} />;
}
