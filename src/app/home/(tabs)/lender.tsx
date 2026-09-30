import { router } from "expo-router";
import { Plus } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { ChipRow } from "@/components/home/chip-row";
import { HeroMetrics } from "@/components/home/hero-metrics";
import { HomeBrand } from "@/components/home/home-brand";
import { LenderHistoryList } from "@/components/home/lender-history-list";
import { LenderVaultCard } from "@/components/home/lender-vault-card";
import { SpotList } from "@/components/home/spot-list";
import { AppText } from "@/components/ui/app-text";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatPercent, formatUsd } from "@/format/format-amount";
import { useHeaderProps } from "@/hooks/use-header-props";
import { useLenderSummary } from "@/hooks/use-lender-summary";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useTheme } from "@/theme/use-theme";

type Tab = "current" | "history";
type LenderView = "lending" | "spot";

const views = [
  { value: "lending", label: "Lending" },
  { value: "spot", label: "Spot" },
] as const;

export default function Lender() {
  const { colors, radius, spacing } = useTheme();
  const header = useHeaderProps();
  const lender = useLenderSummary();
  const portfolio = usePortfolio();
  const [tab, setTab] = useState<Tab>("current");
  const [view, setView] = useState<LenderView>("lending");

  return (
    <Screen
      header={
        <ProductHeader product="home" brand={<HomeBrand />} {...header}>
          <ResourceView resource={lender} emptyLabel="Nothing supplied yet">
            {(data) => (
              <HeroMetrics
                primary={[{ label: "Lender portfolio", value: formatUsd(data.portfolio) }]}
                secondary={[
                  { label: "Total holdings", value: formatUsd(data.totalHoldings) },
                  { label: "Supplied", value: `${data.suppliedAssets} assets` },
                  { label: "Avg supply APY", value: formatPercent(data.avgSupplyApyBps) },
                ]}
              />
            )}
          </ResourceView>
        </ProductHeader>
      }
    >
      <ResourceView resource={lender} emptyLabel="Nothing supplied yet">
        {(data) => (
          <View style={{ gap: spacing.lg }}>
            <SegmentedControl
              segments={[
                { value: "current", label: "Current", badge: String(data.vaults.length) },
                { value: "history", label: "History", badge: String(data.history.reduce((count, group) => count + group.items.length, 0)) },
              ]}
              value={tab}
              onChange={setTab}
            />
            {tab === "history" ? (
              <LenderHistoryList groups={data.history} />
            ) : (
              <>
                <ChipRow options={views} value={view} onChange={setView} />
                {view === "spot" ? (
                  <SpotList
                    walletBalance={portfolio.status === "ready" ? portfolio.data.walletBalance : 0n}
                    balances={data.spot}
                    onSwap={() => router.push("/swap")}
                  />
                ) : (
                  <>
                    {data.vaults.map((vault) => (
                      <LenderVaultCard
                        key={vault.id}
                        vault={vault}
                        onWithdraw={() => router.push("/earn")}
                        onSupplyMore={() => router.push("/earn")}
                      />
                    ))}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Supply to another vault"
                      onPress={() => router.push("/earn")}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: spacing.sm,
                        minHeight: 52,
                        borderRadius: radius.lg,
                        borderWidth: 1,
                        borderStyle: "dashed",
                        borderColor: colors.border,
                      }}
                    >
                      <Plus size={18} color={colors.text} />
                      <AppText variant="body" strong>
                        Supply to another vault
                      </AppText>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>
        )}
      </ResourceView>
    </Screen>
  );
}
