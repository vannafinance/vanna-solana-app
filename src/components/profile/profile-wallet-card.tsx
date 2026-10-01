import { LinearGradient } from "expo-linear-gradient";
import { View } from "react-native";

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
      style={{ flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: 20, paddingHorizontal: spacing.lg, borderRadius: radius.md }}
    >
      <View style={{ width: 56, height: 56, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.onHero, overflow: "hidden" }}>
        <TokenIcon symbol="SOL" size={52} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodyLg" color="onHero" style={{ fontFamily: "monospace", lineHeight: 24 }}>
          {shortAddress(address)}
        </AppText>
        <AppText variant="caption" color="onHeroSoft">
          Solana wallet · Mobile Wallet Adapter
        </AppText>
      </View>
      <IconButton icon="content_copy" label="Copy wallet address" tone="glass" size={44} onPress={onCopy} />
    </LinearGradient>
  );
}
