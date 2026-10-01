import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { formatPercent, formatToken } from "@/format/format-amount";
import { health } from "@/theme/tokens";
import { useTheme } from "@/theme/use-theme";
import type { DeployForm } from "@/types/farm";

import { MenuChevron } from "./anchored-menu";

function Row({ label, value, first }: { label: string; value: string; first?: boolean }) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        minHeight: 40,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <AppText variant="body" color="textMuted">
        {label}
      </AppText>
      <AppText variant="body" strong>
        {value}
      </AppText>
    </View>
  );
}

export function PoolDetails({ form }: { form: DeployForm }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const { pool, collateral } = form;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ height: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <AppText variant="body" strong>
          Pool details and how it works
        </AppText>
        <MenuChevron open={open} size={16} color="textMuted" />
      </Pressable>
      {open ? (
        <View style={{ marginBottom: 14 }}>
          <Row first label={`${pool.symbol} supplied on Kamino`} value={`${formatToken({ raw: pool.totalSupplied, decimals: pool.decimals }, 0)} ${pool.symbol}`} />
          <Row label="Pool usage" value={formatPercent(pool.utilizationBps)} />
          <AppText variant="caption" color="textMuted" style={{ marginTop: 8, lineHeight: 18 }}>
            {`Your ${collateral.symbol} stays as collateral. Vanna lends you ${pool.symbol}, which goes into Kamino and earns its rate while you pay the borrow rate. If the health factor falls to ${health.liquidation.toFixed(2)} the position is liquidated. Rates change, so the APY above can move.`}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
