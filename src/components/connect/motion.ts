import { Easing, Keyframe, withSequence, withTiming } from "react-native-reanimated";

export const emphasized = Easing.bezier(0.2, 0.9, 0.3, 1);

type Frame = readonly [percent: number, value: number];

export function keyframes(frames: readonly Frame[], duration: number, easing = emphasized) {
  const [first, ...rest] = frames.slice(1).map(([percent, value], index) =>
    withTiming(value, { duration: ((percent - frames[index][0]) / 100) * duration, easing }),
  );
  return withSequence(first, ...rest);
}

export function riseIn(distance: number, duration: number, delay: number) {
  return new Keyframe({
    from: { opacity: 0, transform: [{ translateY: distance }] },
    to: { opacity: 1, transform: [{ translateY: 0 }], easing: emphasized },
  })
    .duration(duration)
    .delay(delay);
}
