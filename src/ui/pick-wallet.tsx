import { Pressable, Text, View } from "react-native";

import { TokenLogo } from "@/components/brand";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { openSheet } from "@/ui/overlay";

export type WalletChoice = { app: string; logo: string };

function Choices({ options, onPick }: { options: WalletChoice[]; onPick: (o: WalletChoice) => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      <Text style={{ fontFamily: font.regular, fontSize: 15, lineHeight: 21, color: colors.muted }}>
        {"Your wallet didn't say which app it is. Pick the one you just used, so later requests open it straight away instead of asking Android."}
      </Text>
      {options.map((o) => (
        <Pressable
          key={o.app}
          onPress={() => onPick(o)}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: colors.borderControl }}
          accessibilityRole="button"
          accessibilityLabel={o.app}
        >
          <TokenLogo sym={o.logo} size={32} />
          <Text style={{ fontFamily: font.semibold, fontSize: 16, color: colors.text }}>{o.app}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Asks which of these wallets was just used. Resolves with the pick, or null when the sheet is dismissed. */
export function pickWallet(options: WalletChoice[]): Promise<WalletChoice | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: WalletChoice | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    openSheet({
      title: "Which wallet did you use?",
      onClose: () => finish(null),
      content: (close) => (
        <Choices
          options={options}
          onPick={(o) => {
            finish(o);
            close();
          }}
        />
      ),
    });
  });
}
