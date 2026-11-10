import "@/chain/polyfills";
import { PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, router, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import * as dynamic from "@/chain/dynamic";
import "@/chain/external"; // registers the external wallet signers
import { clearSampleData } from "@/chain/account-live";
import { clearSamplePredict, refreshLivePredict } from "@/screens/predict/model";
import { useWallets } from "@/state/wallets";
import { startAccountLive } from "@/chain/account-live";
import { startLiveData } from "@/chain/live";
import "@/state/appearance";
import { AppLock } from "@/components/app-lock";
import { ChainProvider } from "@/state/chain";
import { hydrateSession, isWelcomeSeen } from "@/state/session";
import { useTheme } from "@/theme/use-theme";
import { OverlayHost } from "@/ui/overlay";
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
  const { signedIn, inUse } = useWallets();
  const inUseSolana = inUse.solana;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
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
