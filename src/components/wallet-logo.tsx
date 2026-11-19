import { Image } from "expo-image";
import { View } from "react-native";

import { LOGO_PNG, LOGO_SVG } from "@/generated/logos";

import { TokenLogo, VannaMark } from "./brand";

const shipped = (logo: string) => logo in LOGO_PNG || logo in LOGO_SVG;

// A wallet's logo on a rounded square: Vanna's own copy for wallets it knows (Phantom, Solflare, Backpack), otherwise the icon the
// wallet sent when it connected (wallet_icon), otherwise the Vanna mark.
export function WalletLogo({ logo, icon, size = 36 }: { logo: string; icon?: string; size?: number }) {
  const box = { width: size, height: size, borderRadius: size * 0.3, overflow: "hidden" as const };
  if (logo !== "VANNA" && shipped(logo))
    return (
      <View style={box}>
        <TokenLogo sym={logo} size={size} />
      </View>
    );
  if (icon)
    return (
      <View style={box}>
        <Image source={{ uri: icon }} style={{ width: size, height: size }} contentFit="cover" accessible={false} />
      </View>
    );
  return (
    <View style={{ ...box, backgroundColor: "#1E1D24", alignItems: "center", justifyContent: "center" }}>
      <VannaMark size={size * 0.62} />
    </View>
  );
}
