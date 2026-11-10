import { type ReactNode, useEffect, useRef, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconAction } from "@/components/ui/kit";
import { MascotDone } from "@/mascot/mascot";
import { TailLoader } from "@/mascot/tail-loader";
import { ACCOUNT } from "@/sample/data";
import { type Chain, CHAIN_LABEL } from "@/state/chain";
import { refreshAccount } from "@/chain/account-live";
import { personalReady } from "@/state/personal";
import { mutate } from "@/state/store";
import { inUseWallet } from "@/state/wallets";
import { authenticate, lockState } from "@/state/lock";
import { useTheme } from "@/theme/use-theme";
import { type Family, font } from "@/theme/tokens";

import { openSheet, toast } from "./overlay";
import { haptic } from "@/ui/haptics";

/* The one transaction sheet every money action uses (design core.js TX): review → sign → progress (Sent, Processed, Confirmed) → done
   or fail. Signing here is the embedded-wallet stand-in (Android passkey / fingerprint, iOS Face ID); real signers (Dynamic embedded
   wallet, Mobile Wallet Adapter, WalletConnect) plug in at sign(). On sample data `apply` mutates the sample state. */
export type TxSpec = {
  chain: Chain;
  fam: Family;
  title: string;
  cta: string;
  legs: { l: string; v: string; s?: string }[];
  rows: [string, string, ("pos" | "neg" | "")?][];
  done: { title: string; line?: string; action?: [string, () => void] };
  apply: () => void;
  // When set, confirm signs and submits this before apply. Omit only for actions that are not on chain yet.
  send?: () => Promise<string | void>;
  // a custom review (design sheets that are their own review, e.g. Close all positions); replaces legs + rows
  body?: ReactNode;
};

const FEE: Record<Chain, string> = { solana: "~0.000005 SOL", stellar: "~0.00001 XLM" };

export function runTx(spec: TxSpec) {
  openSheet({ title: spec.title, content: (close) => <TxFlow spec={spec} close={close} /> });
}

type Phase = "review" | "sign" | "progress" | "done" | "fail";

// With "confirm transactions" on (Account > Security), the phone's own prompt (fingerprint, face unlock, Face ID) opens
// as soon as the sign step shows; otherwise the step is the tap-to-confirm stand-in.
function SignWithBiometrics({ onOk }: { onOk: () => void }) {
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || !lockState().confirmTx) return;
    asked.current = true;
    authenticate("Confirm transaction").then((ok) => ok && onOk());
  }, [onOk]);
  return null;
}

function TxFlow({ spec, close }: { spec: TxSpec; close: () => void }) {
  const { colors } = useTheme();
  const [phase, setPhase] = useState<Phase>("review");
  const [step, setStep] = useState(0);
  const [fail, setFail] = useState("Nothing was sent.");
  const [hash, setHash] = useState<string | null>(null);

  const approve = async () => {
    setPhase("progress");
    setStep(0);
    try {
      // A real wallet must never see a pretend success: actions without an on-chain path stop here.
      if (!spec.send && personalReady(spec.chain)) throw new Error("This action is not connected to the chain yet. Nothing was sent.");
      if (spec.send) {
        setStep(1);
        const h = await spec.send();
        if (h) setHash(h);
        setStep(2);
      }
      setStep(3);
      mutate(spec.apply);
      // re-read the real account so every screen shows the chain's figures
      if (spec.send) void refreshAccount(spec.chain);
      setPhase("done");
      haptic.success();
    } catch (e) {
      setFail(e instanceof Error ? e.message : "The transaction was not sent");
      setPhase("fail");
      haptic.error();
    }
  };
  const finish = (action?: () => void) => {
    close();
    if (action) action();
    else toast(spec.done.title);
  };

  if (phase === "review") {
    const real = inUseWallet(spec.chain);
    const w = real ? { app: real.app, addr: real.addr } : ACCOUNT.wallets[spec.chain];
    return (
      <View style={{ gap: 12, paddingBottom: 4 }}>
        {spec.body ?? (<>
        <View style={[styles.legs, { backgroundColor: colors.bg }]}>
          {spec.legs.map((l, i) => (
            <View key={l.l}>
              {i > 0 && (
                <View style={styles.arrow}>
                  <Icon name="arrow_downward" size={22} color="muted" />
                </View>
              )}
              <Text style={[styles.legL, { color: colors.muted }]}>{l.l}</Text>
              <Text style={[styles.legV, { color: colors.text }]}>{l.v}</Text>
              {l.s && <Text style={[styles.legS, { color: colors.muted }]}>{l.s}</Text>}
            </View>
          ))}
        </View>
        <View>
          {[...spec.rows, ["Fee", FEE[spec.chain]] as [string, string], ["Account", `${w.app} ${w.addr}`] as [string, string]].map(([l, v, t], i) => (
            <View key={l} style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <Text style={[styles.rowL, { color: colors.muted }]}>{l}</Text>
              <Text style={[styles.rowV, { color: t === "pos" ? colors.positive : t === "neg" ? colors.negative : colors.text }]}>{v}</Text>
            </View>
          ))}
        </View>
        </>)}
        <Button label={spec.cta} fam={spec.fam} icon={Platform.OS === "ios" ? "face" : "fingerprint"} onPress={() => setPhase("sign")} />
      </View>
    );
  }

  if (phase === "sign") {
    const ios = Platform.OS === "ios";
    return (
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 8 }}>
        <SignWithBiometrics onOk={approve} />
        <Text style={[styles.h, { color: colors.text }]}>{ios ? "Face ID" : "Confirm it's you"}</Text>
        <Pressable onPress={() => (lockState().confirmTx ? authenticate("Confirm transaction").then((ok) => { if (ok) void approve(); }) : void approve())} accessibilityRole="button" accessibilityLabel={ios ? "Face ID, tap to confirm" : "Use your passkey"} style={[styles.bio, { backgroundColor: colors.purpleTint }]}>
          <Icon name={ios ? "face" : "fingerprint"} size={44} color="#703AE6" />
        </Pressable>
        <Text style={[styles.cap, { color: colors.muted }]}>{ios ? "Look at your phone" : "Touch the sensor"}</Text>
        <Button label="Cancel" v="text" size="md" onPress={() => (haptic.error(), setPhase("fail"))} style={{ alignSelf: "stretch", marginTop: 8 }} />
      </View>
    );
  }

  if (phase === "fail") {
    return (
      <View style={{ gap: 16 }}>
        <View style={styles.hd}>
          <View style={[styles.ring, { backgroundColor: colors.pinkTint }]}>
            <Icon name="close" size={24} color={colors.onPinkTint} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.h, { color: colors.text }]}>Not confirmed</Text>
            <Text style={[styles.cap, { color: colors.muted }]}>{fail}</Text>
          </View>
        </View>
        <Button label="Try again" fam={spec.fam} onPress={() => setPhase("review")} />
        <Button label="Done" v="text" size="md" onPress={() => close()} />
      </View>
    );
  }

  // progress / done (design txView): the tail loader or the done face, the title, the explorer link; then Sent, Processed, Confirmed
  return (
    <View style={{ gap: 20 }}>
      <View style={styles.hd}>
        {phase === "done" ? <MascotDone size={56} /> : <TailLoader size={48} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.h, { color: colors.text }]}>{phase === "done" ? spec.done.title : step === 0 ? "Sending" : `Sent to ${CHAIN_LABEL[spec.chain]}`}</Text>
          {phase === "done" && spec.done.line && <Text style={[styles.cap, { color: colors.muted }]}>{spec.done.line}</Text>}
        </View>
        <IconAction icon="open_in_new" label={`View on ${spec.chain === "solana" ? "Solscan" : "Stellar Expert"}`} onPress={() => (hash ? Linking.openURL(spec.chain === "stellar" ? `https://stellar.expert/explorer/testnet/tx/${hash}` : `https://solscan.io/tx/${hash}`) : toast("Opens the explorer"))} />
      </View>
      <Progress step={step} />
      {phase === "done" && (
        <View style={{ gap: 4 }}>
          <Button label="Done" fam={spec.fam} onPress={() => finish()} />
          {spec.done.action && <Button label={spec.done.action[0]} v="text" size="md" onPress={() => finish(spec.done.action![1])} />}
        </View>
      )}
    </View>
  );
}

function Progress({ step }: { step: number }) {
  const { colors } = useTheme();
  const w = useSharedValue(8);
  useEffect(() => {
    w.value = withTiming([8, 33, 66, 100][step], { duration: 500, easing: Easing.bezier(0.2, 0, 0, 1) });
  }, [step, w]);
  const st = useAnimatedStyle(() => ({ width: `${w.value}%` }));
  return (
    <View style={{ gap: 12 }}>
      <View style={[styles.bar, { backgroundColor: colors.divider }]}>
        <Animated.View style={[styles.fill, { backgroundColor: "#703AE6" }, st]} />
      </View>
      <View style={styles.steps}>
        {["Sent", "Processed", "Confirmed"].map((l, i) => (
          <View key={l} style={styles.step}>
            {i > 0 && <View style={[styles.em, { backgroundColor: colors.border }]} />}
            <View style={[styles.dot, { backgroundColor: step > i ? "#703AE6" : colors.border }]} />
            <Text style={{ fontFamily: font.regular, fontSize: 14, color: step > i ? colors.text : colors.muted }}>{l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legs: { borderRadius: 16, padding: 16 },
  arrow: { alignItems: "center", paddingVertical: 4 },
  legL: { fontFamily: font.regular, fontSize: 13 },
  legV: { fontFamily: font.semibold, fontSize: 22, lineHeight: 30, fontVariant: ["tabular-nums"] },
  legS: { fontFamily: font.regular, fontSize: 12, fontVariant: ["tabular-nums"] },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  rowL: { fontFamily: font.regular, fontSize: 14 },
  rowV: { flex: 1, textAlign: "right", fontFamily: font.semibold, fontSize: 14, fontVariant: ["tabular-nums"] },
  h: { fontFamily: font.semibold, fontSize: 20, lineHeight: 28 },
  cap: { fontFamily: font.regular, fontSize: 13, lineHeight: 18 },
  bio: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginVertical: 16 },
  hd: { flexDirection: "row", alignItems: "center", gap: 14 },
  ring: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  bar: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  steps: { flexDirection: "row", justifyContent: "center", gap: 8 },
  step: { flexDirection: "row", alignItems: "center", gap: 6 },
  em: { width: 20, height: 1, marginRight: 2 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
