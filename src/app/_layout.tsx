import { PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { MobileWalletProvider } from "@wallet-ui/react-native-web3js";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ResourceView } from "@/components/ui/resource-view";
import { SpaceScope } from "@/components/ui/space-scope";
import { restoreAppearance } from "@/hooks/use-appearance";
import { useWalletSession } from "@/hooks/use-wallet-session";
import { APP_IDENTITY, CHAIN, RPC_URL } from "@/lib/solana/config";
import { walletCache } from "@/lib/solana/wallet-cache";

SplashScreen.preventAutoHideAsync();

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener("change", (state) => handleFocus(state === "active"));
  return () => subscription.remove();
});

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } });

function Navigation() {
  const session = useWalletSession();
  return (
    <ResourceView resource={session} emptyLabel="No wallet session">
      {() => (
        <SpaceScope>
          <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
            <Stack.Screen name="faucet" options={{ presentation: "transparentModal", animation: "none" }} />
            <Stack.Screen name="margin" options={{ presentation: "transparentModal", animation: "none" }} />
            <Stack.Screen name="swap" options={{ animation: "slide_from_bottom" }} />
          </Stack>
        </SpaceScope>
      )}
    </ResourceView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold });
  const [appearanceRestored, setAppearanceRestored] = useState(false);
  const ready = (fontsLoaded || fontError !== null) && appearanceRestored;

  useEffect(() => {
    void restoreAppearance().finally(() => setAppearanceRestored(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <QueryClientProvider client={queryClient}>
          <MobileWalletProvider chain={CHAIN} endpoint={RPC_URL} identity={APP_IDENTITY} cache={walletCache}>
            <Navigation />
          </MobileWalletProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
