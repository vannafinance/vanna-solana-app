import { Tabs } from "expo-router";

import { ProductTabBar, type ProductTab } from "@/components/ui/product-tab-bar";
import type { Product } from "@/theme/tokens";

type ProductTabsLayoutProps = {
  product: Product;
  tabs: readonly ProductTab[];
};

// Each tab `key` is the route file name inside the (tabs) group, for example "index" or "positions".
export function ProductTabsLayout({ product, tabs }: ProductTabsLayoutProps) {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <ProductTabBar
          product={product}
          tabs={tabs}
          activeKey={state.routes[state.index].name}
          onSelect={(key) => navigation.navigate(key)}
        />
      )}
    >
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.key} name={tab.key} />
      ))}
    </Tabs>
  );
}
