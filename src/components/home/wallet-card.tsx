import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatToken, formatUsd, formatUsdOrDash } from "@/format/format-amount";
import { changeToday } from "@/format/format-asset";
import { useTheme } from "@/theme/use-theme";
import type { TokenBalance } from "@/types/portfolio";

import { AssetRow } from "./asset-row";
import { CardTitle } from "./card-title";

type WalletCardProps = {
  // Null when the wallet cannot be read.
  total: bigint | null;
  assets: TokenBalance[] | null;
  onSwap: () => void;
};

// The tokens in the user's own wallet. They are not collateral: the margin account only holds what is deposited into it.
export function WalletCard({ total, assets, onSwap }: WalletCardProps) {
  const { spacing } = useTheme();
  const message = assets === null ? "We can't read your wallet right now" : assets.length === 0 ? "No tokens in this wallet yet" : null;

  return (
    <Card>
      <CardTitle title="Wallet" subtitle="Not used as collateral" value={formatUsdOrDash(total)} />
      {message === null ? null : (
        <AppText variant="body" color="textMuted" style={{ marginTop: spacing.sm }}>
          {message}
        </AppText>
      )}
      {assets === null || assets.length === 0 ? null : (
        <>
          <View style={{ marginTop: spacing.xs }}>
            {assets.map((asset, index) => (
              <AssetRow
                key={asset.symbol}
                symbol={asset.symbol}
                detail={`${formatToken(asset.tokens, 2)} ${asset.symbol}`}
                value={formatUsd(asset.value)}
                change={asset.changeTodayBps === undefined ? undefined : changeToday(asset.changeTodayBps)}
                changeBps={asset.changeTodayBps}
                first={index === 0}
              />
            ))}
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Button size="sm" variant="outline" label="Swap" onPress={onSwap} />
          </View>
        </>
      )}
    </Card>
  );
}
