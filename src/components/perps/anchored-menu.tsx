import { type ReactNode, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import { useTheme } from "@/theme/use-theme";

type Anchor = { x: number; y: number; width: number; height: number };

type AnchoredMenuProps = {
  renderTrigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  label: string;
  width?: number;
  align?: "left" | "right";
  overhang?: number;
  gap?: number;
  scrim?: boolean;
  radius?: number;
  padding?: number;
};

const EDGE = 16;

export function AnchoredMenu({
  renderTrigger,
  children,
  label,
  width,
  align = "left",
  overhang = 0,
  gap = 8,
  scrim = false,
  radius,
  padding = 8,
}: AnchoredMenuProps) {
  const { colors, motion, radius: radii, shadow } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [trigger, setTrigger] = useState<View | null>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const open = anchor !== null;

  const close = () => setAnchor(null);
  const toggle = () => {
    if (open) {
      close();
      return;
    }
    trigger?.measureInWindow((x, y, anchorWidth, height) => setAnchor({ x, y, width: anchorWidth, height }));
  };

  const horizontal = (() => {
    if (!anchor) return {};
    if (width === undefined) return { left: EDGE, right: EDGE };
    const left = align === "left" ? anchor.x : anchor.x + anchor.width - width + overhang;
    return { left: Math.max(EDGE / 2, Math.min(left, screenWidth - width - EDGE / 2)), width };
  })();

  return (
    <View ref={setTrigger} collapsable={false}>
      {renderTrigger({ open, toggle })}
      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={close}>
        <Pressable accessibilityLabel={`Close ${label}`} style={{ flex: 1 }} onPress={close}>
          {scrim ? (
            <Animated.View
              entering={FadeIn.duration(motion.duration.short)}
              style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.scrim }}
            />
          ) : null}
          {anchor ? (
            <Animated.View
              entering={FadeInUp.duration(motion.duration.medium)}
              accessibilityViewIsModal
              accessibilityLabel={label}
              style={[
                {
                  position: "absolute",
                  top: anchor.y + anchor.height + gap,
                  ...horizontal,
                  padding,
                  borderRadius: radius ?? radii.md,
                  borderWidth: 1,
                  borderColor: colors.divider,
                  backgroundColor: colors.surface,
                },
                shadow.menu,
              ]}
            >
              {children(close)}
            </Animated.View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
