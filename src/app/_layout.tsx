import { PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold, useFonts } from "@expo-google-fonts/plus-jakarta-sans";
import { MobileWalletProvider } from "@wallet-ui/react-native-web3js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ResourceView } from "@/components/ui/resource-view";
import { useWalletSession } from "@/hooks/use-wallet-session";
import { APP_IDENTITY, CHAIN, RPC_URL } from "@/lib/solana/config";
import { walletCache } from "@/lib/solana/wallet-cache";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 10_000 } } });

function Navigation() {
  const session = useWalletSession();
  return (
    <ResourceView resource={session} emptyLabel="No wallet session">
      {() => <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }} />}
    </ResourceView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_600SemiBold });
  const ready = fontsLoaded || fontError !== null;

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
