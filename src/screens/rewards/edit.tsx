import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/ui/button";
import { checkCode, checkName, REFERRAL, RENAME_ON, rewardsNow, setRewards, useRewards } from "@/sample/rewards";
import { useTheme } from "@/theme/use-theme";
import { font } from "@/theme/tokens";
import { closeSheet, openSheet, toast } from "@/ui/overlay";

// The display-name and referral-code editors (design rw-name / rw-code sheets), opened from Rewards and from Account.
export const openEditName = () => openSheet({ title: "Display name", content: () => <EditName /> });
function EditName() {
  const { colors } = useTheme();
  const me = useRewards();
  const [v, setV] = useState(me.name);
  const c = checkName(v, me.name, me.renamed);
  return (
    <View style={{ paddingBottom: 8 }}>
      <Text style={[styles.body14, { color: colors.text }]}>How you show on the leaderboard and to friends you invite.</Text>
      <View style={[styles.sheetF, { borderColor: c.bad ? colors.negative : colors.borderControl }]}>
        <Text style={[styles.ofL, { color: colors.text, backgroundColor: colors.surface }]}>Display name</Text>
        <TextInput value={v} onChangeText={setV} maxLength={24} autoCorrect={false} autoCapitalize="none" autoFocus style={[styles.ofIn, { color: colors.text }]} accessibilityLabel="Display name" />
      </View>
      <Text style={[styles.cap, { marginTop: 6, color: c.ok ? colors.positive : c.bad ? colors.negative : colors.muted }]}>{c.msg}</Text>
      <Button label="Save" style={{ marginTop: 20 }} disabled={!c.ok} onPress={() => (setRewards({ name: v.trim(), renamed: RENAME_ON }), closeSheet(), toast("Name saved"))} />
    </View>
  );
}

export const openEditCode = () => openSheet({ title: "Edit referral code", content: () => <EditCode /> });
function EditCode() {
  const { colors } = useTheme();
  const cur = rewardsNow().code;
  const [v, setV] = useState(cur);
  const c = checkCode(v, cur);
  return (
    <View style={{ paddingBottom: 8 }}>
      <Text style={[styles.body14, { color: colors.text }]}>You can change it once. Links with {cur} keep working.</Text>
      <View style={[styles.sheetF, { borderColor: c.bad ? colors.negative : colors.borderControl }]}>
        <Text style={[styles.ofL, { color: colors.text, backgroundColor: colors.surface }]}>New code</Text>
        <TextInput value={v} onChangeText={(t) => setV(t.toUpperCase().replace(/\s/g, "").slice(0, 20))} maxLength={20} autoCorrect={false} autoCapitalize="characters" autoFocus style={[styles.ofIn, { color: colors.text }]} accessibilityLabel="New code" />
      </View>
      <Text style={[styles.cap, { marginTop: 6, color: c.ok ? colors.positive : c.bad ? colors.negative : colors.muted }]}>{c.msg}</Text>
      <Text style={[styles.cap, { marginTop: 12, color: colors.text }]}>test.vanna.finance/?ref={v || cur}</Text>
      <Button
        label="Save code"
        style={{ marginTop: 20 }}
        disabled={!c.ok}
        onPress={() => {
          REFERRAL.code = v;
          REFERRAL.link = `test.vanna.finance/?ref=${v}`;
          setRewards({ code: v, codeEdited: true });
          closeSheet();
          toast("Code saved");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  body14: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, flexShrink: 1 },
  sheetF: { height: 56, borderRadius: 10, borderWidth: 1, justifyContent: "center", paddingHorizontal: 14, marginTop: 18 },
  ofL: { position: "absolute", top: -9, left: 10, paddingHorizontal: 4, fontFamily: font.regular, fontSize: 12, lineHeight: 16 },
  ofIn: { fontFamily: font.semibold, fontSize: 16, paddingVertical: 0 },
  cap: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, fontVariant: ["tabular-nums"] },
});
