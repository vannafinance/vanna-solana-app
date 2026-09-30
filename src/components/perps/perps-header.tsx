import { ChartLineUp } from "phosphor-react-native";
import type { ReactNode } from "react";

import { ProductHeader } from "@/components/ui/product-header";

type PerpsHeaderProps = {
  onBack: () => void;
  notificationCount?: number;
  onNotifications: () => void;
  onAvatar: () => void;
  children?: ReactNode;
};

export function PerpsHeader({ children, ...header }: PerpsHeaderProps) {
  return (
    <ProductHeader product="perps" title="Perps" icon={ChartLineUp} {...header}>
      {children}
    </ProductHeader>
  );
}
