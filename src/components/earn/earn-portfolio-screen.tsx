import { HandCoins, Plus } from "phosphor-react-native";
import { useState } from "react";
import { FlatList, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { ProductHeader } from "@/components/ui/product-header";
import { ResourceView } from "@/components/ui/resource-view";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useTheme } from "@/theme/use-theme";
import type { EarnHistoryGroup, EarnPortfolio, EarnPosition } from "@/types/earn";
import type { Resource } from "@/types/resource";

import { EarnHistoryGroupCard } from "./earn-history-group-card";
import { EarnPortfolioHero } from "./earn-portfolio-hero";
import { EarnPositionCard } from "./earn-position-card";

export type PortfolioView = "current" | "history";

type Row =
  | { key: string; kind: "position"; position: EarnPosition }
  | { key: string; kind: "group"; group: EarnHistoryGroup };

type EarnPortfolioScreenProps = {
  initialView: PortfolioView;
  portfolio: Resource<EarnPortfolio>;
  history: Resource<readonly EarnHistoryGroup[]>;
  notificationCount: number;
  onNotifications: () => void;
  onAvatar: () => void;
  onBack: () => void;
  onWithdraw: (vaultId: string) => void;
  onSupplyMore: (vaultId: string) => void;
  onBrowseVaults: () => void;
};

export function EarnPortfolioScreen({
  initialView,
  portfolio,
  history,
  notificationCount,
  onNotifications,
  onAvatar,
  onBack,
  onWithdraw,
  onSupplyMore,
  onBrowseVaults,
}: EarnPortfolioScreenProps) {
  const { colors, radius, spacing } = useTheme();
  const [view, setView] = useState<PortfolioView>(initialView);

  const header = (
    <ProductHeader
      product="earn"
      icon={HandCoins}
      title="Earn"
      onBack={onBack}
      notificationCount={notificationCount}
      onNotifications={onNotifications}
      onAvatar={onAvatar}
    >
      {portfolio.status === "ready" ? <EarnPortfolioHero summary={portfolio.data.summary} /> : null}
    </ProductHeader>
  );

  if (portfolio.status !== "ready") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {header}
        <ResourceView resource={portfolio} emptyLabel="Nothing supplied yet">
          {() => null}
        </ResourceView>
      </View>
    );
  }

  const groups = history.status === "ready" ? history.data : [];
  const historyCount = groups.reduce((count, group) => count + group.entries.length, 0);
  const rows: Row[] =
    view === "current"
      ? portfolio.data.positions.map((position) => ({ key: position.vaultId, kind: "position", position }))
      : groups.map((group) => ({ key: group.label, kind: "group", group }));

  return (
    <FlatList
      data={rows}
      keyExtractor={(row) => row.key}
      style={{ flex: 1, backgroundColor: colors.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      ListHeaderComponent={
        <>
          {header}
          <View style={{ padding: spacing.lg }}>
            <SegmentedControl
              segments={[
                { value: "current", label: "Current", badge: String(portfolio.data.positions.length) },
                { value: "history", label: "History", badge: String(historyCount) },
              ]}
              value={view}
              onChange={setView}
            />
          </View>
        </>
      }
      ListEmptyComponent={
        view === "history" ? (
          <ResourceView resource={history} emptyLabel="No earn history yet">
            {() => null}
          </ResourceView>
        ) : (
          <View style={{ padding: spacing.xl, alignItems: "center" }}>
            <AppText color="textMuted">Nothing supplied yet. Pick a vault to start earning.</AppText>
          </View>
        )
      }
      ListFooterComponent={
        view === "current" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Supply to another vault"
            onPress={onBrowseVaults}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: spacing.sm,
              minHeight: 52,
              marginHorizontal: spacing.lg,
              marginTop: spacing.md,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderStyle: "dashed",
              borderColor: colors.border,
            }}
          >
            <Plus size={18} color={colors.text} />
            <AppText strong>Supply to another vault</AppText>
          </Pressable>
        ) : null
      }
      renderItem={({ item }) => (
        <View style={{ marginHorizontal: spacing.lg }}>
          {item.kind === "position" ? (
            <EarnPositionCard
              position={item.position}
              onWithdraw={() => onWithdraw(item.position.vaultId)}
              onSupplyMore={() => onSupplyMore(item.position.vaultId)}
            />
          ) : (
            <EarnHistoryGroupCard group={item.group} />
          )}
        </View>
      )}
    />
  );
}
