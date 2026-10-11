import { type ReactNode, type RefObject, useEffect, useState } from "react";
import { Modal, Pressable, type View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { type ThemeColor, useTheme } from "@/theme/use-theme";

type Rect = { x: number; y: number; width: number; height: number };

type AnchoredMenuProps = {
  open: boolean;
  anchor: RefObject<View | null>;
  onClose: () => void;
  accessibilityLabel: string;
  gap: number;
  placement: { kind: "stretch"; bleed: number } | { kind: "end"; width: number };
  children: ReactNode;
};

const OPEN_MS = 220;
const CLOSE_MS = 140;
const EASE = Easing.bezier(0.2, 0, 0, 1);

export function AnchoredMenu({ open, anchor, onClose, accessibilityLabel, gap, placement, children }: AnchoredMenuProps) {
  const { colors, shadow } = useTheme();
  const [rect, setRect] = useState<Rect | null>(null);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (open) {
      anchor.current?.measureInWindow((x, y, width, height) => {
        setRect({ x, y, width, height });
        progress.value = withTiming(1, { duration: OPEN_MS, easing: EASE });
      });
      return;
    }
    progress.value = withTiming(0, { duration: CLOSE_MS, easing: EASE });
    const timer = setTimeout(() => setRect(null), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open, anchor, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -8 }, { scale: 0.94 + progress.value * 0.06 }],
  }));

  if (!rect) return null;

  const width = placement.kind === "stretch" ? rect.width + placement.bleed * 2 : placement.width;
  const left = placement.kind === "stretch" ? rect.x - placement.bleed : rect.x + rect.width - placement.width;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close menu" style={{ flex: 1 }} onPress={onClose}>
        <Animated.View
          accessibilityRole="menu"
          accessibilityLabel={accessibilityLabel}
          style={[
            {
              position: "absolute",
              left,
              top: rect.y + rect.height + gap,
              width,
              padding: 6,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.divider,
              backgroundColor: colors.surface,
              transformOrigin: placement.kind === "end" ? "top right" : "top center",
            },
            shadow.menu,
            animated,
          ]}
        >
          {children}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

type MenuChevronProps = {
  open: boolean;
  size: number;
  color: ThemeColor;
};

export function MenuChevron({ open, size, color }: MenuChevronProps) {
  const turn = useSharedValue(0);

  useEffect(() => {
    turn.value = withTiming(open ? 1 : 0, { duration: OPEN_MS, easing: EASE });
  }, [open, turn]);

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value * 180}deg` }] }));

  return (
    <Animated.View style={style}>
      <Icon name="keyboard_arrow_down" size={size} color={color} />
    </Animated.View>
  );
}
