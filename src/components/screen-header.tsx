import { type Href, router, useNavigation } from "expo-router";
import type { ReactNode } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";

import { Icon } from "./ui/icon";

// Plain header for pushed screens (design .phd): back, a 20 px left title (no large title on either OS), trailing actions.
// `home`: where Back goes when this screen is the first of its own stack (opened from another tab), instead of the previous tab.
export function ScreenHeader({ title, trail, home }: { title: string; trail?: ReactNode; home?: Href }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation();
  const ios = Platform.OS === "ios";
  const back = () => {
    if (home && (nav.getState()?.routes.length ?? 0) <= 1) router.replace(home);
    else if (router.canGoBack()) router.back();
    else router.replace("/portfolio");
  };
  return (
    <View style={[styles.phd, { paddingTop: insets.top, height: 56 + insets.top, backgroundColor: colors.bg }]}>
      <Pressable
        onPress={back}
        accessibilityRole="button"
        accessibilityLabel="Back"
        android_ripple={{ color: colors.divider, borderless: true, radius: 24 }}
        style={[styles.bk, ios && styles.bkIos]}
      >
        <Icon name={ios ? "chevron_left" : "arrow_back"} size={ios ? 30 : 24} />
      </Pressable>
      <Text style={[styles.ttl, { color: colors.text }]} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {trail && <View style={styles.trail}>{trail}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  phd: { flexDirection: "row", alignItems: "center", paddingLeft: 4, paddingRight: 8, gap: 4 },
  bk: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  bkIos: { width: 44, height: 44, alignItems: "flex-start", paddingLeft: 4 },
  ttl: { flex: 1, fontFamily: font.semibold, fontSize: 20, lineHeight: 28, paddingLeft: 4 },
  trail: { flexDirection: "row", alignItems: "center", gap: 4 },
});
