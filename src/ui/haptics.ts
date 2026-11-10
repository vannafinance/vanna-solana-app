import * as Haptics from "expo-haptics";

/* Haptics are punctuation (Appllama skill, native fidelity law 10): one per user action, on the same frame as the visual, never on
   scroll or tab switches. tick = a slider crossing a whole step; tap = a quick fill (%, Max, flip); success / error = a transaction's
   outcome. Web has no haptics, so every call is a safe no-op there. */
const on = process.env.EXPO_OS !== "web";
const safe = (p: Promise<void>) => void p.catch(() => {});

export const haptic = {
  tick: () => on && safe(Haptics.selectionAsync()),
  tap: () => on && safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  success: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  error: () => on && safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
