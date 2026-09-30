import { Copy } from "phosphor-react-native";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/icon-button";
import { TokenIcon } from "@/components/ui/token-icon";
import { shortAddress } from "@/format/short-address";
import { useTheme } from "@/theme/use-theme";

type ProfileWalletCardProps = {
  address: string;
  onCopy: () => void;
};

export function ProfileWalletCard({ address, onCopy }: ProfileWalletCardProps) {
  const { colors, gradients, radius, spacing } = useTheme();
  const gradient = gradients.home;

  return (
    <LinearGradient
      colors={gradient.colors}
      locations={gradient.locations}
      start={gradient.start}
      end={gradient.end}
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, padding: spacing.lg, borderRadius: radius.lg }}
    >
      <View style={{ borderRadius: radius.pill, borderWidth: 2, borderColor: colors.onHero, overflow: "hidden" }}>
        <TokenIcon symbol="SOL" size={56} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="title" color="onHero" style={{ fontFamily: "monospace" }}>
          {shortAddress(address)}
        </AppText>
        <AppText variant="body" color="onHeroMuted">
          Solana wallet · Mobile Wallet Adapter
        </AppText>
      </View>
      <IconButton icon={Copy} label="Copy wallet address" tone="glass" onPress={onCopy} />
    </LinearGradient>
  );
}
