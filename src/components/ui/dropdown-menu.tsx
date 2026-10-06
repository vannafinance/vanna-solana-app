import { type ReactNode, useEffect, useRef, useState } from "react";
import { Modal, Pressable, useWindowDimensions, View } from "react-native";
import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { useTheme } from "@/theme/use-theme";

import { AppText } from "./app-text";
import { Icon } from "./icon";
import { ripple } from "./ripple";

export type MenuOption<T extends string> = {
  value: T;
  label: string;
  detail?: string;
  badge?: string;
  disabled?: boolean;
  leading?: ReactNode;
};

type TriggerState = { open: boolean; toggle: () => void };

type DropdownMenuProps<T extends string> = {
  // The label of the default pill trigger; unused when `renderTrigger` supplies the control.
  label?: string;
  options: readonly MenuOption<T>[];
  value: T;
  onSelect: (value: T) => void;
  accessibilityLabel: string;
  menuWidth?: number;
  // Replaces the pill with the caller's own control (a whole card, say); the menu then opens under it, as wide as the control.
  renderTrigger?: (state: TriggerState) => ReactNode;
};

type Anchor = { x: number; y: number; width?: number };

const CLOSE_MS = 140;
const GAP = 8;
const EDGE = 16;
const EASE = Easing.bezier(0.2, 0, 0, 1);

export function DropdownMenu<T extends string>({ label, options, value, onSelect, accessibilityLabel, menuWidth = 260, renderTrigger }: DropdownMenuProps<T>) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const trigger = useRef<View>(null);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [open, setOpen] = useState(false);
  const progress = useSharedValue(0);
  const chevron = useSharedValue(0);

  useEffect(() => {
    chevron.value = withTiming(open ? 1 : 0, { duration: 220, easing: EASE });
    progress.value = withTiming(open ? 1 : 0, { duration: open ? 220 : CLOSE_MS, easing: EASE });
  }, [open, chevron, progress]);

  const chevronStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${chevron.value * 180}deg` }] }));

  const show = () => {
    trigger.current?.measureInWindow((x, y, width, height) => {
      setAnchor(renderTrigger ? { x, y: y + height + GAP, width } : { x: Math.min(x, screenWidth - menuWidth - EDGE), y: y + height + GAP });
      setOpen(true);
    });
  };

  const close = () => {
    setOpen(false);
    setTimeout(() => setAnchor(null), CLOSE_MS);
  };

  const toggle = open ? close : show;

  return (
    <View ref={trigger} collapsable={false}>
      {renderTrigger ? (
        <CustomTrigger render={renderTrigger} open={open} toggle={toggle} />
      ) : (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: open }}
        android_ripple={ripple(colors.text)}
        onPress={toggle}
        style={{
          height: 40,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingLeft: 16,
          paddingRight: 12,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          overflow: "hidden",
        }}
      >
        <AppText variant="body" strong>
          {label}
        </AppText>
        <Animated.View style={chevronStyle}>
          <Icon name="keyboard_arrow_down" size={18} color="text" />
        </Animated.View>
      </Pressable>
      )}
      <Modal visible={anchor !== null} transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={close}>
        <Pressable accessibilityLabel="Close menu" style={{ flex: 1 }} onPress={close}>
          {anchor ? (
            <MenuSurface anchor={anchor} width={anchor.width ?? menuWidth} progress={progress}>
              {options.map((option, index) => (
                <MenuItem
                  key={option.value}
                  option={option}
                  index={index}
                  open={open}
                  selected={option.value === value}
                  onPress={() => {
                    onSelect(option.value);
                    close();
                  }}
                />
              ))}
            </MenuSurface>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}

function CustomTrigger({ render, open, toggle }: TriggerState & { render: (state: TriggerState) => ReactNode }) {
  return <>{render({ open, toggle })}</>;
}

type MenuSurfaceProps = {
  anchor: Anchor;
  width: number;
  progress: SharedValue<number>;
  children: ReactNode;
};

function MenuSurface({ anchor, width, progress, children }: MenuSurfaceProps) {
  const { colors, shadow } = useTheme();
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -8 }, { scale: 0.94 + progress.value * 0.06 }],
  }));

  return (
    <Animated.View
      accessibilityRole="menu"
      style={[
        {
          position: "absolute",
          left: anchor.x,
          top: anchor.y,
          width,
          padding: 6,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.divider,
          backgroundColor: colors.surface,
          transformOrigin: "top left",
        },
        shadow.menu,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

type MenuItemProps<T extends string> = {
  option: MenuOption<T>;
  index: number;
  open: boolean;
  selected: boolean;
  onPress: () => void;
};

const STAGGER_MS = 20;

function MenuItem<T extends string>({ option, index, open, selected, onPress }: MenuItemProps<T>) {
  const { colors, radius } = useTheme();
  const shown = useSharedValue(0);

  useEffect(() => {
    shown.value = open ? withDelay(Math.min(index, 4) * STAGGER_MS, withTiming(1, { duration: 240, easing: EASE })) : 1;
  }, [open, index, shown]);

  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: (1 - shown.value) * -4 }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        accessibilityRole="menuitem"
        accessibilityLabel={option.label}
        accessibilityState={{ selected, disabled: option.disabled }}
        disabled={option.disabled}
        android_ripple={ripple(colors.text)}
        onPress={onPress}
        style={{
          height: 56,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 10,
          borderRadius: radius.sm,
          overflow: "hidden",
          backgroundColor: selected ? colors.purpleTint : "transparent",
        }}
      >
        {option.leading}
        <View style={{ flex: 1 }}>
          <AppText variant="body" strong style={{ lineHeight: 20, color: option.disabled ? colors.textMuted : colors.text }}>
            {option.label}
          </AppText>
          {option.detail ? (
            <AppText variant="caption" color="textMuted" style={{ lineHeight: 16 }}>
              {option.detail}
            </AppText>
          ) : null}
        </View>
        {selected ? <Icon name="check" size={18} color="link" /> : null}
        {option.badge ? (
          <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: colors.background, justifyContent: "center" }}>
            <AppText variant="caption" strong>
              {option.badge}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
