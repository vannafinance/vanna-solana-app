import { createContext } from "react";
import type { SharedValue } from "react-native-reanimated";

import type { Space } from "@/theme/tokens";

// What `Screen` tells the header it holds while a module page comes into view: how far the arrival has got (0 to 1) and, when the user
// came from another module, which module that was, so the header can start in that module's colours and blend into its own.
export type PageMotion = { reveal: SharedValue<number> | null; from: Space | null };

export const PageMotionContext = createContext<PageMotion>({ reveal: null, from: null });
