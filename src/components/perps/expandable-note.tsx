import { CaretDown, CaretUp } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useTheme } from "@/theme/use-theme";

type ExpandableNoteProps = { title: string; body: string };

export function ExpandableNote({ title, body }: ExpandableNoteProps) {
  const { colors, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const Caret = open ? CaretUp : CaretDown;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        onPress={() => setOpen(!open)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52 }}
      >
        <AppText variant="body" strong>
          {title}
        </AppText>
        <Caret size={16} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <AppText variant="caption" color="textMuted" style={{ paddingBottom: spacing.lg, lineHeight: 18 }}>
          {body}
        </AppText>
      ) : null}
    </View>
  );
}
