import { useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { TokenIcon } from "@/components/ui/token-icon";
import { formatToken, formatUsd } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { CollateralSymbol, DeployForm } from "@/types/farm";

import { AnchoredMenu, MenuChevron } from "./anchored-menu";
import { CapsLabel } from "./caps-label";
import { MenuOption } from "./menu-option";
import { SwipeSwitch } from "./swipe-switch";

type DepositCardProps = {
  form: DeployForm;
  onChangeAmount: (text: string) => void;
  onMax: () => void;
  onSelectCollateral: (symbol: CollateralSymbol) => void;
  onStepCollateral: (direction: 1 | -1) => void;
};

function issueText({ issue, collateral, pool }: DeployForm) {
  if (issue === "no-balance") return `No ${collateral.symbol} in your wallet. Pick another asset.`;
  if (issue === "over-balance") return "That is more than your wallet balance.";
  if (issue === "pool-liquidity") return `Vanna has only ${formatToken({ raw: pool.borrowable, decimals: pool.decimals }, 0)} ${pool.symbol} free to lend right now. Lower the leverage or the amount.`;
  if (issue === "too-risky") return "With your open positions this leaves the account too close to liquidation. Lower the leverage.";
  return null;
}

export function DepositCard({ form, onChangeAmount, onMax, onSelectCollateral, onStepCollateral }: DepositCardProps) {
  const { colors, fontFamily, radius } = useTheme();
  const [open, setOpen] = useState(false);
  const chip = useRef<View>(null);
  const error = issueText(form);
  const balance = formatToken({ raw: form.collateral.balance, decimals: form.collateral.decimals }, 2);

  return (
    <Card padded={false} style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.sm, backgroundColor: colors.background }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <CapsLabel>YOU DEPOSIT</CapsLabel>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <AppText variant="caption" color="textMuted">
              {`Wallet: ${balance}`}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Use full wallet balance"
              onPress={onMax}
              hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
              style={{ height: 22, paddingHorizontal: 8, borderRadius: radius.tag, backgroundColor: colors.purpleTint, justifyContent: "center" }}
            >
              <AppText variant="caption" strong color="link">
                MAX
              </AppText>
            </Pressable>
          </View>
        </View>
        <View style={{ marginTop: 6, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TextInput
            scrollEnabled={false}
            accessibilityLabel={`${form.collateral.symbol} amount to deposit`}
            value={form.amountText}
            onChangeText={onChangeAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              minWidth: 0,
              padding: 0, includeFontPadding: false, textAlignVertical: "center",
              fontSize: 28,
              lineHeight: 36,
              fontFamily: fontFamily.semibold,
              color: form.issue === "over-balance" ? colors.negative : colors.text,
            }}
          />
          <View ref={chip} collapsable={false}>
            <SwipeSwitch onSwitch={onStepCollateral}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Collateral token, ${form.collateral.symbol}`}
                accessibilityHint={form.held.length > 1 ? "Swipe up or down to switch asset" : undefined}
                accessibilityState={{ expanded: open }}
                onPress={() => setOpen(!open)}
                style={{
                  height: 44,
                  paddingLeft: 6,
                  paddingRight: 12,
                  borderRadius: 22,
                  borderWidth: 1,
                  borderColor: open ? colors.primary : colors.divider,
                  backgroundColor: colors.surface,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TokenIcon symbol={form.collateral.symbol} size={30} />
                <AppText variant="bodyLg" strong style={{ fontSize: 15 }}>
                  {form.collateral.symbol}
                </AppText>
                <MenuChevron open={open} size={14} color="text" />
              </Pressable>
            </SwipeSwitch>
          </View>
        </View>
        <View style={{ marginTop: 2, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <AppText variant="caption" color="textMuted">
            {formatUsd(form.quote.collateralValueUsd)}
          </AppText>
        </View>
        {error ? (
          <AppText variant="caption" color="negative" style={{ marginTop: 6 }}>
            {error}
          </AppText>
        ) : null}
      </View>
      <AnchoredMenu open={open} anchor={chip} onClose={() => setOpen(false)} accessibilityLabel="Collateral token" gap={12} placement={{ kind: "end", width: 220 }}>
        {form.collaterals.map((collateral) => {
          const selected = collateral.symbol === form.collateral.symbol;
          return (
            <MenuOption
              key={collateral.symbol}
              label={collateral.symbol}
              selected={selected}
              height={48}
              labelColor={selected ? "link" : "text"}
              icon={<TokenIcon symbol={collateral.symbol} size={26} />}
              onPress={() => {
                onSelectCollateral(collateral.symbol);
                setOpen(false);
              }}
              trailing={
                <AppText variant="caption" color="textMuted">
                  {collateral.balance > 0n ? formatToken({ raw: collateral.balance, decimals: collateral.decimals }, 2) : "0"}
                </AppText>
              }
            />
          );
        })}
      </AnchoredMenu>
    </Card>
  );
}
