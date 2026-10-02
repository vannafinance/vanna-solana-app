import { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import Animated, { cancelAnimation, Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";
import type { ConfirmStage, TransactionState } from "@/types/transaction";

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

const SLOW_AFTER_MS = 12_000;

export function TransactionSheet({ state, onPrimary, onClose, primaryLabel, onExplorer }: TransactionSheetProps) {
  const { colors, layout, motion, radius, shadow } = useTheme();
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
              alignSelf: "center",
              width: "100%",
              maxWidth: layout.sheetMaxWidth,
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: Math.max(insets.bottom + 12, 28),
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              backgroundColor: colors.surface,
            },
            shadow.floating,
          ]}
        >
          {state.phase === "signing" ? <SigningRow key={state.prepared ? "approve" : "prepare"} state={state} /> : null}
          {state.phase === "confirming" ? <StatusRow ring="arc" title={state.title} detail={state.message} /> : null}
          {state.phase === "success" ? <StatusRow ring="seal" title={state.title} detail={state.message} /> : null}
          {state.phase === "failure" ? (
            <StatusRow ring={rejected ? "off" : "fail"} title={state.title} detail={state.message} />
          ) : null}
          {state.phase === "confirming" || state.phase === "success" ? <Progress stage={state.phase === "success" ? "success" : state.stage} /> : null}
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

type SigningRowProps = { state: Extract<TransactionState, { phase: "signing" }> };

// Two waits that look alike but are not: the app preparing the transaction, then the wallet opening to ask. Each says what
// it is doing, and says so plainly when it takes longer than usual. The key on this row restarts the timer for each.
function SigningRow({ state }: SigningRowProps) {
  const slow = useElapsed(SLOW_AFTER_MS);
  const chip = state.steps > 1 ? `Step ${state.step} of ${state.steps}` : undefined;

  if (!state.prepared) {
    return (
      <StatusRow
        ring="arc"
        title="Preparing your transaction"
        detail={slow ? "This is taking longer than usual. The network may be slow. You can cancel and try again." : "Checking it on the network before your wallet opens."}
        chip={chip}
      />
    );
  }
  return (
    <StatusRow
      ring="wait"
      title={`Approve in ${state.wallet}`}
      detail={slow ? `Waiting for ${state.wallet}. If it did not open, cancel and try again. Nothing was sent.` : "Nothing moves until you approve."}
      chip={chip}
    />
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
type Stage = ConfirmStage | "success";
// How far along each stage is: nothing reached the network yet, accepted, processed by a validator, confirmed.
const LEVEL: Record<Stage, number> = { sending: 0, sent: 1, processed: 2, success: 3 };
const TRACK_WIDTH = 280;
const TRACK_HEIGHT = 4;
const SWEEP_WIDTH = 72;
const MIN_FILL = 0.04;

// True once the view has been on screen for `delayMs`. Every transaction mounts a fresh progress view.
function useElapsed(delayMs: number) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return elapsed;
}

// Centered progress for a transaction on its way. The bar fills as each real stage arrives from the network, and a soft
// sweep keeps moving along it while the next stage is awaited, so a slow confirmation never looks frozen.
function Progress({ stage }: { stage: Stage }) {
  const { colors } = useTheme();
  const level = LEVEL[stage];
  const waiting = stage !== "success";
  const slow = useElapsed(SLOW_AFTER_MS) && waiting;
  const fill = useSharedValue(Math.max(level / 3, MIN_FILL));
  const sweep = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(Math.max(level / 3, MIN_FILL), { duration: 420, easing: Easing.out(Easing.cubic) });
  }, [level, fill]);

  useEffect(() => {
    if (!waiting) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }
    sweep.value = 0;
    sweep.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }), -1);
    return () => cancelAnimation(sweep);
  }, [waiting, sweep]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const sweepStyle = useAnimatedStyle(() => ({
    opacity: waiting ? 0.5 : 0,
    transform: [{ translateX: -SWEEP_WIDTH + sweep.value * (TRACK_WIDTH + SWEEP_WIDTH) }],
  }));

  const label = stage === "success" ? "Sent, processed and confirmed" : stage === "processed" ? "Sent and processed" : stage === "sent" ? "Sent" : "Sending";

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 3, now: level }}
      style={{ marginTop: 18, alignItems: "center", gap: 10 }}
    >
      <View style={{ width: "100%", maxWidth: TRACK_WIDTH, height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, overflow: "hidden", backgroundColor: colors.border }}>
        <Animated.View style={[{ height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: colors.link }, fillStyle]} />
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: SWEEP_WIDTH, borderRadius: TRACK_HEIGHT / 2, backgroundColor: colors.surface }, sweepStyle]} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {STEPS.map((step, index) => {
          const lit = level >= index + 1;
          return (
            <View key={step} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {index > 0 ? <View style={{ width: 14, height: 1, backgroundColor: colors.border }} /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lit ? colors.link : colors.border }} />
                <AppText variant="caption" style={{ color: lit ? colors.text : colors.textMuted }}>
                  {step}
                </AppText>
              </View>
            </View>
          );
        })}
      </View>
      {slow ? (
        <AppText variant="caption" color="textMuted" style={{ textAlign: "center" }}>
          Still waiting on the network. Your transaction is on its way.
        </AppText>
      ) : null}
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
  if (state.phase === "confirming") {
    return onExplorer && state.signature ? (
      <View style={{ marginTop: 6 }}>
        <Button size="md" variant="text" label="View on Solana Explorer" onPress={onExplorer} />
      </View>
    ) : null;
  }

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
          <Button size="md" variant="tonal" label={state.actionLabel ?? primaryLabel ?? "Try again"} onPress={onPrimary} />
          <Button size="md" variant="text" label="Close" onPress={onClose} />
        </>
      ) : null}
    </View>
  );
}
