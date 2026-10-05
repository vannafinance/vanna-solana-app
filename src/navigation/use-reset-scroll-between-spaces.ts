import { useFocusEffect } from "expo-router";
import { useCallback, useRef } from "react";

type Scrollable = { scrollTo?: (options: { x?: number; y?: number; animated?: boolean }) => void; scrollToOffset?: (options: { offset: number; animated?: boolean }) => void };

// The page that most recently came into view, across every page that uses this hook. When a page comes into view and the last one
// was a different page, the user switched to it (another space or another tab); when it was this same page, the user is back from
// a detail screen opened on top of it, and keeps their place.
let lastShown: object | null = null;

// The spaces and their tabs stay mounted, so each keeps where it was scrolled to. Switching to a page should open it at the top, as
// opening it fresh would. The jump happens as the page comes into view (it is still invisible at the start of the crossfade), not
// as the old one fades out.
// Returns the ref to put on the scrollable (a ScrollView, FlatList or animated ScrollView).
export function useResetScrollBetweenSpaces() {
  const scrollable = useRef<Scrollable | null>(null);
  const page = useRef({});

  useFocusEffect(
    useCallback(() => {
      if (lastShown !== null && lastShown !== page.current) {
        scrollable.current?.scrollTo?.({ y: 0, animated: false });
        scrollable.current?.scrollToOffset?.({ offset: 0, animated: false });
      }
      lastShown = page.current;
    }, []),
  );

  return useCallback((instance: Scrollable | null) => {
    scrollable.current = instance;
  }, []);
}
