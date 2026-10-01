import { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";
import type { TransactionState } from "@/types/transaction";

import { AppText } from "./app-text";
import { Button } from "./button";
import { TransactionRing, type RingKind } from "./transaction-ring";

type TransactionSheetProps = {
  state: TransactionState | null;
  onPrimary: () => void;
  onClose: () => void;
  primaryLabel?: string;
  onExplorer?: () => void;
};

const PROCESSED_AFTER_MS = 500;

export function TransactionSheet({ state, onPrimary, onClose, primaryLabel, onExplorer }: TransactionSheetProps) {
  const { colors, motion, radius, shadow } = useTheme();
  const insets = useSafeAreaInsets();
  if (!state) return null;

  const confirming = state.phase === "confirming";
  const rejected = state.phase === "failure" && state.kind === "rejected";

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={confirming ? undefined : onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Animated.View
          entering={FadeIn.duration(motion.duration.short)}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.walletScrim }}
        />
        <Animated.View
          entering={FadeInDown.duration(motion.duration.long).easing(Easing.bezier(0.05, 0.7, 0.1, 1))}
          accessibilityLiveRegion="polite"
          style={[
            {
              marginHorizontal: 12,
              marginBottom: insets.bottom + 12,
              alignSelf: "center",
              width: "100%",
              maxWidth: 560,
              padding: 16,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
            shadow.floating,
          ]}
        >
          {state.phase === "signing" ? (
            <StatusRow ring="wait" title={`Approve in ${state.wallet}`} detail="Nothing moves until you approve." chip={state.steps > 1 ? `Step ${state.step} of ${state.steps}` : undefined} />
          ) : null}
          {confirming ? <StatusRow ring="arc" title="Sent to Solana" detail="Usually under 2 seconds" /> : null}
          {state.phase === "success" ? <StatusRow ring="seal" title={state.title} detail={state.message} /> : null}
          {state.phase === "failure" ? (
            <StatusRow ring={rejected ? "off" : "fail"} title={state.title} detail={state.message} />
          ) : null}
          {confirming || state.phase === "success" ? <Progress complete={state.phase === "success"} /> : null}
          <Actions
            state={state}
            primaryLabel={primaryLabel}
            onPrimary={onPrimary}
            onClose={onClose}
            onExplorer={onExplorer}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

type StatusRowProps = {
  ring: RingKind;
  title: string;
  detail: string;
  chip?: string;
};

function StatusRow({ ring, title, detail, chip }: StatusRowProps) {
  const { colors, motion } = useTheme();

  return (
    <Animated.View entering={FadeInDown.duration(motion.duration.medium)} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
      <TransactionRing kind={ring} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyLg" strong style={{ lineHeight: 22 }}>
          {title}
        </AppText>
        {detail ? (
          <AppText variant="label" color="textMuted" style={{ lineHeight: 18 }}>
            {detail}
          </AppText>
        ) : null}
      </View>
      {chip ? (
        <View style={{ height: 24, paddingHorizontal: 8, borderRadius: 12, backgroundColor: colors.background, justifyContent: "center" }}>
          <AppText variant="caption" strong color="textMuted">
            {chip}
          </AppText>
        </View>
      ) : null}
    </Animated.View>
  );
}

const STEPS = ["Sent", "Processed", "Confirmed"] as const;

function Progress({ complete }: { complete: boolean }) {
  const { colors } = useTheme();
  const [processed, setProcessed] = useState(complete);

  useEffect(() => {
    if (complete) return;
    const timer = setTimeout(() => setProcessed(true), PROCESSED_AFTER_MS);
    return () => clearTimeout(timer);
  }, [complete]);

  const lit = (index: number) => complete || index === 0 || (index === 1 && processed);

  return (
    <View accessibilityLabel={complete ? "Sent, processed and confirmed" : processed ? "Sent and processed" : "Sent"} style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 6 }}>
      {STEPS.map((step, index) => (
        <View key={step} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {index > 0 ? <View style={{ width: 14, height: 1, backgroundColor: colors.border }} /> : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lit(index) ? colors.link : colors.border }} />
            <AppText variant="caption" style={{ color: lit(index) ? colors.text : colors.textMuted }}>
              {step}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

type ActionsProps = {
  state: TransactionState;
  primaryLabel?: string;
  onPrimary: () => void;
  onClose: () => void;
  onExplorer?: () => void;
};

function Actions({ state, primaryLabel, onPrimary, onClose, onExplorer }: ActionsProps) {
  if (state.phase === "confirming") return null;

  return (
    <View style={{ marginTop: 14, gap: 2 }}>
      {state.phase === "signing" ? <Button size="md" variant="text" label="Cancel" onPress={onClose} /> : null}
      {state.phase === "success" ? (
        <>
          <Button size="md" variant="tonal" label={primaryLabel ?? "Done"} onPress={onPrimary} />
          {onExplorer ? <Button size="md" variant="text" label={state.explorerLabel ?? "View on Solana Explorer"} onPress={onExplorer} /> : null}
          {primaryLabel ? <Button size="md" variant="text" label="Done" onPress={onClose} /> : null}
        </>
      ) : null}
      {state.phase === "failure" ? (
        <>
          <Button size="md" variant="tonal" label={primaryLabel ?? "Try again"} onPress={onPrimary} />
          <Button size="md" variant="text" label="Close" onPress={onClose} />
        </>
      ) : null}
    </View>
  );
}
