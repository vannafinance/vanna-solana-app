import { useNavigation } from "expo-router";
import { type ReactNode, useEffect, useState } from "react";
import { View } from "react-native";

import { Swap } from "@/components/motion";

/* Pushed screens keep the slide smooth by drawing only their header during the transition; the body mounts when the push has
   finished (transitionEnd, or 400 ms at most) and fades in. */
export function useTransitionReady() {
  const nav = useNavigation();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 400);
    // @ts-expect-error transitionEnd exists on stack navigators
    const off = nav.addListener("transitionEnd", () => setReady(true));
    return () => {
      clearTimeout(t);
      off();
    };
  }, [nav]);
  return ready;
}

export function AfterTransition({ children }: { children: ReactNode }) {
  const ready = useTransitionReady();
  return ready ? <Swap k="ready" style={{ flex: 1 }}>{children}</Swap> : <View style={{ flex: 1 }} />;
}
