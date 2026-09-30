import { View } from "react-native";

import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatSignedUsd, formatUsd } from "@/format/format-amount";
import type { PerpsPortfolio } from "@/types/perps";
import { useTheme } from "@/theme/use-theme";

import { PerpsHeader } from "./perps-header";
import { PnlHero } from "./pnl-hero";

export type PortfolioMode = "current" | "history";

type PerpsPortfolioHeaderProps = {
  mode: PortfolioMode;
  portfolio: PerpsPortfolio;
  headerProps: {
    onBack: () => void;
    notificationCount?: number;
    onNotifications: () => void;
    onAvatar: () => void;
  };
  onSelectMode: (mode: PortfolioMode) => void;
};

export function PerpsPortfolioHeader({ mode, portfolio, headerProps, onSelectMode }: PerpsPortfolioHeaderProps) {
  const { spacing } = useTheme();
  const { account } = portfolio;
  const current = mode === "current";
  const pnl = current ? portfolio.openPnl : portfolio.realizedPnl;

  return (
    <>
      <PerpsHeader {...headerProps}>
        <PnlHero
          label={current ? "Open PnL" : "Closed PnL"}
          value={formatSignedUsd(pnl)}
          positive={pnl >= 0n}
          health={account.health}
          stats={[
            { label: "Margin", value: formatUsd(account.margin) },
            { label: "Available", value: formatUsd(account.available) },
            { label: "Borrowed", value: formatUsd(account.borrowed) },
          ]}
        />
      </PerpsHeader>
      <View style={{ padding: spacing.lg, paddingBottom: 0 }}>
        <SegmentedControl
          value={mode}
          onChange={onSelectMode}
          segments={[
            { value: "current", label: "Current", badge: String(portfolio.positions.length) },
            { value: "history", label: "History", badge: String(portfolio.closed.length) },
          ]}
        />
      </View>
    </>
  );
}
