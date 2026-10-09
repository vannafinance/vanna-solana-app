import { type ReactNode, useCallback, useState } from "react";
import { type LayoutChangeEvent, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The least that stays clear above a sheet that is as tall as it can be.
const TOP_GAP = 8;

// How tall a sheet may be: the window it opens in, less the status bar and a little air. A sheet is as tall as its content, and
// content grows with a longer list, a larger font setting or a shorter phone; without a cap it runs up under the status bar and
// its title is covered. Put `onLayout` on the full-window view the sheet sits in and `maxHeight` on the sheet.
export function useSheetRoom() {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const onLayout = useCallback((event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height), []);

  return { onLayout, maxHeight: height > 0 ? Math.max(height - insets.top - TOP_GAP, 0) : undefined };
}

// A sheet's content. It is its natural height when it fits, and scrolls inside the sheet's cap when it does not, so the title and
// the safe area below stay in place. It only claims touches when there is something to scroll, so lists inside it keep working.
export function SheetBody({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(0);
  const [viewport, setViewport] = useState(0);

  return (
    <ScrollView
      scrollEnabled={content > viewport + 1}
      onContentSizeChange={(_, height) => setContent(height)}
      onLayout={(event) => setViewport(event.nativeEvent.layout.height)}
      bounces={false}
      overScrollMode="never"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
