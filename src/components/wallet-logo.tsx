import { View } from "react-native";

import { TokenLogo, VannaMark } from "./brand";

// A wallet's logo on a rounded square (wallet apps) or the Vanna mark (the email / Google / X wallet).
export function WalletLogo({ logo, size = 36 }: { logo: string; size?: number }) {
  if (logo === "VANNA")
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: "#1E1D24", alignItems: "center", justifyContent: "center" }}>
        <VannaMark size={size * 0.62} />
      </View>
    );
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, overflow: "hidden" }}>
      <TokenLogo sym={logo} size={size} />
    </View>
  );
}
