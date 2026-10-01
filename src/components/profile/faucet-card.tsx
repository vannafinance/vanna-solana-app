import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { formatUnits } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";

type FaucetCardProps<S extends string> = {
  symbols: readonly S[];
  state:
    | { status: "idle" }
    | { status: "pending"; symbol: string }
    | { status: "granted"; grant: { symbol: string; added: bigint; decimals: number } }
    | { status: "error"; message: string };
  onRequest: (symbol: S) => void;
};

function caption(state: FaucetCardProps<string>["state"]): { text: string; tone: "textMuted" | "positive" | "negative" } {
  switch (state.status) {
    case "pending":
      return { text: `Adding ${state.symbol}...`, tone: "textMuted" };
    case "granted":
      return { text: `Added ${formatUnits(state.grant.added, state.grant.decimals, 2)} ${state.grant.symbol}`, tone: "positive" };
    case "error":
      return { text: state.message, tone: "negative" };
    case "idle":
      return { text: "Test tokens for the Vanna fork. SOL for fees is not included.", tone: "textMuted" };
  }
}

export function FaucetCard<S extends string>({ symbols, state, onRequest }: FaucetCardProps<S>) {
  const { spacing } = useTheme();
  const { text, tone } = caption(state);

  return (
    <Card style={{ gap: spacing.md }}>
      <AppText variant="body" strong color="textMuted">
        Test faucet
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {symbols.map((symbol) => (
          <Chip
            key={symbol}
            label={symbol}
            selected={state.status === "pending" && state.symbol === symbol}
            onPress={() => {
              if (state.status !== "pending") onRequest(symbol);
            }}
          />
        ))}
      </View>
      <AppText variant="caption" color={tone}>
        {text}
      </AppText>
    </Card>
  );
}
