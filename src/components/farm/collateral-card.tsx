import { useState } from "react";
import { View } from "react-native";

import { AmountField } from "@/components/ui/amount-field";
import { Card } from "@/components/ui/card";
import { TokenPill } from "@/components/ui/token-pill";
import { formatUsd, formatToken } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { CollateralSymbol, DeployForm } from "@/types/farm";

import { DropdownOption } from "./dropdown-option";
import { StepHeader } from "./step-header";

type CollateralCardProps = {
  form: DeployForm;
  onChangeAmount: (text: string) => void;
  onMax: () => void;
  onSelectCollateral: (symbol: CollateralSymbol) => void;
};

const MAX_FILL = [{ label: "MAX", fraction: 1 }] as const;

function issueText(form: DeployForm) {
  if (form.issue === "no-balance") return `No ${form.collateral.symbol} in your wallet. Pick another asset.`;
  if (form.issue === "over-balance") return "That is more than your wallet balance.";
  return undefined;
}

export function CollateralCard({ form, onChangeAmount, onMax, onSelectCollateral }: CollateralCardProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const balance = formatToken({ raw: form.collateral.balance, decimals: form.collateral.decimals }, 2);

  return (
    <Card>
      <View style={{ gap: spacing.lg }}>
        <StepHeader step={1} title="Deposit collateral" subtitle="Any stock or PreStock on Solana" />
        <View style={{ padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.background }}>
          <AmountField
            label="You deposit"
            caption={`Wallet: ${balance}`}
            value={form.amountText}
            onChangeText={onChangeAmount}
            tokenSlot={<TokenPill symbol={form.collateral.symbol} onPress={() => setOpen(!open)} />}
            quickFills={MAX_FILL}
            onQuickFill={onMax}
            secondary={`≈ ${formatUsd(form.quote.collateralValueUsd)}`}
            error={issueText(form)}
          />
        </View>
        {open ? (
          <View style={{ gap: 4 }}>
            {form.collaterals.map((collateral) => (
              <DropdownOption
                key={collateral.symbol}
                symbol={collateral.symbol}
                selected={collateral.symbol === form.collateral.symbol}
                primary={collateral.balance > 0n ? formatToken({ raw: collateral.balance, decimals: collateral.decimals }, 2) : "0"}
                onPress={() => {
                  onSelectCollateral(collateral.symbol);
                  setOpen(false);
                }}
              />
            ))}
          </View>
        ) : null}
      </View>
    </Card>
  );
}
