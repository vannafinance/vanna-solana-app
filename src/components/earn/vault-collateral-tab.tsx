import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { TokenIcon } from "@/components/ui/token-icon";
import { type TokenAmount, formatPercent } from "@/format/format-amount";
import { formatSummaryAmount } from "@/format/format-earn";
import { useTheme } from "@/theme/use-theme";
import type { EarnAsset, VaultDetail } from "@/types/earn";

import { FactCard, SectionTitle } from "./fact-card";

type CapUsageProps = {
  label: string;
  usedLabel: string;
  usageBps: number | null;
  used: TokenAmount;
  cap: TokenAmount | null;
  symbol: EarnAsset;
  first?: boolean;
};

// How much of a cap is used: the share on the right, a bar, then the amount used and the cap at either end.
function CapUsage({ label, usedLabel, usageBps, used, cap, symbol, first = false }: CapUsageProps) {
  const { colors, spacing } = useTheme();
  const capped = usageBps !== null && cap !== null;

  return (
    <View style={{ paddingVertical: spacing.md + 2, gap: spacing.sm, borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <AppText variant="body" color="textMuted" numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="body" strong numberOfLines={1}>
          {capped ? formatPercent(usageBps, 1) : "No cap"}
        </AppText>
      </View>
      {capped ? (
        <View style={{ height: 8, borderRadius: 4, overflow: "hidden", backgroundColor: colors.divider }}>
          <View style={{ width: `${Math.min(usageBps / 100, 100)}%`, minWidth: 6, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
        </View>
      ) : null}
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing.md }}>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>{`${usedLabel} ${formatSummaryAmount(used, symbol)}`}</AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {capped ? `Cap ${formatSummaryAmount(cap, symbol)}` : "No limit set"}
        </AppText>
      </View>
    </View>
  );
}

const FLAG_COLUMN = 76;
const BONUS_COLUMN = 64;

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${on ? "yes" : "no"}`} style={{ width: FLAG_COLUMN, alignItems: "center" }}>
      {on ? (
        <Icon name="check_circle" size={18} filled color="positive" />
      ) : (
        <AppText variant="body" color="textMuted">
          —
        </AppText>
      )}
    </View>
  );
}

export function VaultCollateralTab({ vault }: { vault: VaultDetail }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ marginTop: spacing.md }}>
      <FactCard>
        <CapUsage first label="Supply cap usage" usedLabel="Supplied" usageBps={vault.supplyCapUsageBps} used={vault.supplied} cap={vault.supplyCap} symbol={vault.symbol} />
        <CapUsage label="Borrow cap usage" usedLabel="Borrowed" usageBps={vault.borrowCapUsageBps} used={vault.borrowed} cap={vault.borrowCap} symbol={vault.symbol} />
      </FactCard>
      <SectionTitle title="Assets on a margin account" marginTop={20} marginBottom={8} />
      <FactCard>
        <View style={{ height: 40, flexDirection: "row", alignItems: "center" }}>
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ flex: 1 }}>
            Asset
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ width: FLAG_COLUMN, textAlign: "center" }}>
            Collateral
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ width: FLAG_COLUMN, textAlign: "center" }}>
            Borrow
          </AppText>
          <AppText variant="caption" color="textMuted" numberOfLines={1} style={{ width: BONUS_COLUMN, textAlign: "right" }}>
            Liq. bonus
          </AppText>
        </View>
        {vault.collateralAssets.map((asset) => (
          <View key={asset.symbol} style={{ minHeight: 52, flexDirection: "row", alignItems: "center", borderTopWidth: 1, borderTopColor: colors.divider }}>
            <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <TokenIcon symbol={asset.symbol} size={28} />
              <AppText variant="body" strong numberOfLines={1} style={{ flexShrink: 1 }}>
                {asset.symbol}
              </AppText>
            </View>
            <Flag on={asset.collateral} label="Collateral" />
            <Flag on={asset.borrow} label="Borrowable" />
            <AppText variant="body" strong numberOfLines={1} style={{ width: BONUS_COLUMN, textAlign: "right" }}>
              {formatPercent(asset.liquidationBonusBps)}
            </AppText>
          </View>
        ))}
      </FactCard>
    </View>
  );
}
