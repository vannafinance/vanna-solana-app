import type { ReactNode } from "react";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";

type PageProps = { children: ReactNode };

// The frame every screen sits in. The app draws edge to edge, so on Android the bottom system bar (three buttons, a gesture
// line, or nothing, depending on the phone and its settings) lies over whatever is at the bottom of the screen.
//
// This is a native safe area view that reads the bar's size from the system and pads only the part of itself that the bar
// really overlaps. A page pushed over the others gets the room it needs; a page that already ends above the module bar gets
// none, so no screen has to know which device it runs on. Use it, or `Screen`, for the root of a screen rather than working the
// bottom inset out by hand.
export function Page({ children }: PageProps) {
  const { colors } = useTheme();

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      {children}
    </SafeAreaView>
  );
}
