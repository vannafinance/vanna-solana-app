import { router } from "expo-router";

import { EarnPortfolioScreen } from "@/components/earn/earn-portfolio-screen";
import { useEarnHistory } from "@/hooks/use-earn-history";
import { useEarnPositions } from "@/hooks/use-earn-positions";
import { useHeaderProps } from "@/hooks/use-header-props";

export default function EarnHistoryScreen() {
  const headerProps = useHeaderProps();
  const portfolio = useEarnPositions();
  const history = useEarnHistory();

  return (
    <EarnPortfolioScreen
      initialView="history"
      portfolio={portfolio}
      history={history}
      {...headerProps}
      onBack={() => router.back()}
      onWithdraw={(id) => router.push(`/earn/withdraw/${id}`)}
      onSupplyMore={(id) => router.push(`/earn/supply/${id}`)}
      onBrowseVaults={() => router.navigate("/earn")}
    />
  );
}
