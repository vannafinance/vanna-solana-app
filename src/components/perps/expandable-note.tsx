import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { ripple } from "@/components/ui/ripple";
import { useTheme } from "@/theme/use-theme";

type ExpandableNoteProps = { title: string; body: string };

export function ExpandableNote({ title, body }: ExpandableNoteProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.divider }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        android_ripple={ripple(colors.text)}
        onPress={() => setOpen(!open)}
        style={{ height: 52, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
      >
        <AppText variant="body" strong>
          {title}
        </AppText>
        <Icon name="keyboard_arrow_down" size={16} color="textMuted" rotate={open ? 180 : undefined} />
      </Pressable>
      {open ? (
        <AppText variant="caption" color="textMuted" style={{ marginBottom: 16, lineHeight: 18 }}>
          {body}
        </AppText>
      ) : null}
    </View>
  );
}
