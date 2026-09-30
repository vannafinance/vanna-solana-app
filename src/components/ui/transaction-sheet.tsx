import { Check, Wallet, WifiSlash, X } from "phosphor-react-native";
import { ActivityIndicator, View } from "react-native";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { BottomSheet } from "./bottom-sheet";
import { Button } from "./button";

export type TransactionState =
  | { phase: "signing"; step: number; steps: number; wallet: string }
  | { phase: "confirming"; title: string; message: string }
  | { phase: "success"; title: string; message: string; explorerLabel?: string }
  | { phase: "failure"; kind: "network" | "rejected"; title: string; message: string };

type TransactionSheetProps = {
  state: TransactionState | null;
  onPrimary: () => void;
  onClose: () => void;
  primaryLabel?: string;
  onExplorer?: () => void;
};

export function TransactionSheet({ state, onPrimary, onClose, primaryLabel, onExplorer }: TransactionSheetProps) {
  const { colors, radius, spacing } = useTheme();
  if (!state) return null;

  const busy = state.phase === "confirming";
  const badge = (() => {
    switch (state.phase) {
      case "signing":
        return { bg: colors.purpleTint, node: <Wallet size={40} color={colors.primary} weight="fill" /> };
      case "confirming":
        return { bg: colors.purpleTint, node: <ActivityIndicator size="large" color={colors.primary} /> };
      case "success":
        return { bg: colors.positive, node: <Check size={48} color="#FFFFFF" weight="bold" /> };
      case "failure":
        return {
          bg: colors.negative,
          node: state.kind === "network" ? <WifiSlash size={44} color="#FFFFFF" weight="bold" /> : <X size={44} color="#FFFFFF" weight="bold" />,
        };
    }
  })();

  const title = state.phase === "signing" ? `Approve in ${state.wallet}` : state.title;
  const message =
    state.phase === "signing"
      ? `${state.wallet} opened with this request. Nothing moves until you approve.`
      : state.message;

  return (
    <BottomSheet visible onDismiss={onClose} dismissable={!busy}>
      <View accessibilityLiveRegion="polite" style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.md }}>
        <View style={{ width: 96, height: 96, borderRadius: radius.pill, backgroundColor: badge.bg, alignItems: "center", justifyContent: "center" }}>
          {badge.node}
        </View>
        {state.phase === "signing" ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.segment }}>
            <AppText variant="label" color="textMuted" strong>
              {`Step ${state.step} of ${state.steps}`}
            </AppText>
          </View>
        ) : null}
        <AppText variant="heading" style={{ textAlign: "center" }}>
          {title}
        </AppText>
        <AppText variant="bodyLg" color="textMuted" style={{ textAlign: "center" }}>
          {message}
        </AppText>
        {state.phase === "success" && onExplorer ? (
          <Button variant="text" size="md" label={state.explorerLabel ?? "View on Solana Explorer"} onPress={onExplorer} />
        ) : null}
      </View>
      {busy ? null : (
        <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
          <Button
            label={primaryLabel ?? defaultPrimary(state)}
            variant={state.phase === "success" ? "dark" : "primary"}
            onPress={onPrimary}
          />
          <Button label={state.phase === "success" ? "Close" : "Cancel"} variant="text" onPress={onClose} />
        </View>
      )}
    </BottomSheet>
  );
}

function defaultPrimary(state: TransactionState) {
  if (state.phase === "signing") return `Open ${state.wallet}`;
  if (state.phase === "failure") return "Try again";
  return "Done";
}
