import "@/chain/polyfills";
import { PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as dynamic from "@/chain/dynamic";
import { useSessionGuard } from "@/chain/session-guard";
import { resumeSocialSignIn } from "@/chain/social-resume";
import "@/chain/external"; // registers the external wallet signers
import { clearSampleData } from "@/chain/account-live";
import { clearSamplePredict, refreshLivePredict } from "@/screens/predict/model";
import { useWallets } from "@/state/wallets";
import { startAccountLive } from "@/chain/account-live";
import { startLiveData } from "@/chain/live";
import "@/state/appearance";
import { AppLock } from "@/components/app-lock";
import { ChainProvider } from "@/state/chain";
import { reapplyAppearance } from "@/state/appearance";
import { hydrateSession, isWelcomeSeen } from "@/state/session";
import { useTheme } from "@/theme/use-theme";
import { closeSheet, OverlayHost } from "@/ui/overlay";
import { ThemeFadeHost } from "@/ui/theme-fade";


if (dynamic.available) {
  clearSampleData();
  clearSamplePredict();
}
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold });
  // Wallets load before the first screen. The intro plays on every fresh open.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    hydrateSession().finally(() => setHydrated(true));
  }, []);
  const ready = (fontsLoaded || !!fontError) && hydrated;
  useSessionGuard(ready);
  const { signedIn, inUse } = useWallets();
  const inUseSolana = inUse.solana;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  // the saved light / dark choice, applied again now that the screen is up (and whenever the app comes back)
  useEffect(() => {
    if (!ready) return;
    reapplyAppearance();
    const t = setTimeout(reapplyAppearance, 600);
    const sub = AppState.addEventListener("change", (st) => st === "active" && reapplyAppearance());
    return () => (clearTimeout(t), sub.remove());
  }, [ready]);
  // A reload used to restore Portfolio. Until this open's intro is finished, stay on it.
  useEffect(() => {
    if (!ready || (isWelcomeSeen() && signedIn)) return;
    if (pathname === "/welcome" || pathname.startsWith("/sign-in")) return;
    router.replace("/welcome");
  }, [ready, pathname, signedIn]);
  useEffect(() => {
    if (signedIn) void refreshLivePredict(true).catch(() => {});
  }, [signedIn, inUseSolana]);
  useEffect(() => startLiveData(), []);
  useEffect(() => startAccountLive(), []);
  useEffect(() => {
    if (dynamic.available) dynamic.configure().catch(() => {});
  }, []);
  // The sheet / overlay state lives outside React, so it survives a screen rebuild (a reload, or Dynamic's sign-in restart) and a stale
  // review sheet would sit on top of the intro. A fresh start begins with nothing open.
  useEffect(() => {
    closeSheet();
  }, []);
  // A Google / X sign-in whose browser tab closed restarted the app: finish it from Dynamic's session (see social-resume.ts).
  useEffect(() => {
    if (ready) void resumeSocialSignIn();
  }, [ready]);

  if (!ready) return null;

  const base = isDark ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={{ ...base, colors: { ...base.colors, background: colors.bg, card: colors.surface, text: colors.text } }}>
          <ChainProvider>
            <StatusBar style="light" />
            {/* pushed screens slide in from the right on both platforms, as shipped */}
            <Stack screenOptions={{ headerShown: false, animation: "ios_from_right", contentStyle: { backgroundColor: colors.bg } }} />
            <OverlayHost />
            <AppLock />
            <ThemeFadeHost />
          </ChainProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
