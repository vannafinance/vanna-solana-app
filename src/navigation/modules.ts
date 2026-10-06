import type { IconName } from "@/components/ui/material-symbols";
import type { Space } from "@/theme/tokens";

import { spaceRoutes } from "./routes";

// The four modules are the app's top level and sit in the bottom bar (ModuleBar); each module's pages are the pill bar in its
// header (SpaceHeader). Swap is not a module: it uses the wallet, not the margin account, so it is a separate round
// action in the middle of the bottom bar.
export type ModulePage = { key: string; label: string; icon: IconName };

export type Module = { space: Space; label: string; icon: IconName; href: string; pages: readonly ModulePage[] };

export const modules: readonly Module[] = [
  {
    space: "portfolio",
    label: "Portfolio",
    icon: "pie_chart",
    href: spaceRoutes.portfolio,
    pages: [
      { key: "index", label: "Overview", icon: "home" },
      { key: "lender", label: "Lender", icon: "toll" },
      { key: "trader", label: "Trader", icon: "trending_up" },
    ],
  },
  {
    space: "earn",
    label: "Earn",
    icon: "savings",
    href: spaceRoutes.earn,
    pages: [
      { key: "index", label: "Vaults", icon: "savings" },
      { key: "positions", label: "Positions", icon: "layers" },
      { key: "history", label: "History", icon: "history" },
    ],
  },
  {
    space: "trade",
    // Long or short with leverage, funded by the margin account (not plain perps, and not Swap, which uses the wallet).
    label: "Margin trade",
    icon: "candlestick_chart",
    href: spaceRoutes.trade,
    pages: [
      { key: "index", label: "Markets", icon: "show_chart" },
      { key: "positions", label: "Positions", icon: "layers" },
      { key: "history", label: "History", icon: "history" },
    ],
  },
  {
    space: "farm",
    label: "Farm",
    icon: "eco",
    href: spaceRoutes.farm,
    pages: [
      { key: "index", label: "Pools", icon: "eco" },
      { key: "positions", label: "Positions", icon: "layers" },
      { key: "history", label: "History", icon: "history" },
    ],
  },
];

export function moduleFor(space: Space): Module {
  return modules.find((module) => module.space === space) ?? modules[0];
}
