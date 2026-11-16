import { LinearGradient } from "expo-linear-gradient";
import { type Href, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { VannaMark, Wordmark } from "@/components/brand";
import { setRewards, useRewards } from "@/sample/rewards";
import { markWelcomeSeen } from "@/state/session";
import { BRAND_GRADIENT, font } from "@/theme/tokens";

/* Display name, shown once to a new person right after the wallet connects (the wallet itself connects from the intro through
   Android's own chooser, so there is no connect screen). Then the first-time chooser. */
const BG = "#000000", SF = "#161618", MU = "#A9A9B2";

export default function SignIn() {
  const insets = useSafeAreaInsets();
  const me = useRewards();
  const [name, setName] = useState(me.name === "Maya" ? "" : me.name);

  const finish = () => {
    markWelcomeSeen();
    router.replace("/spaces" as Href);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: BG }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={[s.body, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]} keyboardShouldPersistTaps="handled">
        <View style={s.lockup} accessibilityLabel="Vanna">
          <VannaMark size={40} />
          <Wordmark height={20} />
        </View>
        <Text style={[s.h, { marginTop: 12 }]}>Pick a display name</Text>
        <Text style={s.sub}>Shown on the leaderboard. You can change it once a season.</Text>
        <View style={s.field}>
          <TextInput value={name} onChangeText={setName} placeholder="Display name" placeholderTextColor={MU} maxLength={20} style={s.input} accessibilityLabel="Display name" />
        </View>
        <View style={{ flex: 1, minHeight: 24 }} />
        <Pressable
          onPress={() => {
            if (name.trim()) setRewards({ name: name.trim() });
            finish();
          }}
          style={s.cta}
          accessibilityRole="button"
        >
          <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          <Text style={s.ctaT}>Open Vanna</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  body: { flexGrow: 1, paddingHorizontal: 22, gap: 22 },
  h: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 26, lineHeight: 32, marginTop: 6 },
  sub: { color: MU, fontFamily: font.regular, fontSize: 15, lineHeight: 21 },
  field: { flexDirection: "row", alignItems: "center", height: 54, borderRadius: 27, borderWidth: 1, borderColor: "#3A3944", backgroundColor: SF, paddingLeft: 18, paddingRight: 18 },
  input: { flex: 1, minWidth: 0, color: "#FFFFFF", fontFamily: font.regular, fontSize: 16, height: "100%" },
  lockup: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  cta: { height: 54, borderRadius: 27, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  ctaT: { color: "#FFFFFF", fontFamily: font.semibold, fontSize: 16 },
});
