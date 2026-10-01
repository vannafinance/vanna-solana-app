import { LinearGradient } from "expo-linear-gradient";
import { Pressable, View } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Icon } from "@/components/ui/icon";
import { shortAddress } from "@/format/short-address";
import { brand, palette } from "@/theme/tokens";
import type { ConnectPhase } from "@/types/connection";

import { Handshake, type HandshakeMode } from "./handshake";
import { MorphLoader } from "./morph-loader";
import { riseIn } from "./motion";
import { PillButton } from "./pill-button";

type ConnectSheetProps = {
  phase: ConnectPhase;
  walletMissing: boolean;
  declinedByWallet: boolean;
  walletName?: string;
  address: string;
  errorMessage?: string;
  onConnect: () => void;
  onInstallPhantom: () => void;
  onInstallSolflare: () => void;
  onRetry: () => void;
  onContinue: () => void;
  onDismiss: () => void;
};

type Step = "pick" | "install" | "approving" | "connected" | "declined";

function stepOf({ phase, walletMissing }: Pick<ConnectSheetProps, "phase" | "walletMissing">): Step {
  if (phase === "pick") return walletMissing ? "install" : "pick";
  return phase;
}

const handshakeMode: Record<Step, HandshakeMode> = {
  pick: "enter",
  install: "none",
  approving: "wait",
  connected: "linked",
  declined: "fell",
};

function Copy({ title, message }: { title: string; message?: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <AppText variant="heading" color="onHero" style={{ lineHeight: 28, textAlign: "center" }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="body" style={{ marginTop: 4, lineHeight: 20, textAlign: "center", color: palette.dark.textMuted }}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

function Waiting() {
  return (
    <View
      style={{
        marginTop: 20,
        alignSelf: "center",
        width: 240,
        height: 52,
        borderRadius: 26,
        backgroundColor: palette.dark.purpleTint,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <MorphLoader color={palette.dark.onPurpleTint} />
      <AppText variant="bodyLg" strong style={{ color: palette.dark.onPurpleTint }}>
        Waiting for wallet
      </AppText>
    </View>
  );
}

function AddressChip({ address }: { address: string }) {
  return (
    <View
      style={{
        marginTop: 10,
        alignSelf: "center",
        height: 30,
        paddingLeft: 6,
        paddingRight: 12,
        borderRadius: 15,
        backgroundColor: palette.dark.purpleTint,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <LinearGradient colors={[brand.short, brand.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 20, height: 20, borderRadius: 10 }} />
      <AppText variant="label" strong style={{ color: palette.dark.onPurpleTint }}>
        {shortAddress(address)}
      </AppText>
    </View>
  );
}

function Body(props: ConnectSheetProps & { step: Step }) {
  const { step } = props;

  if (step === "pick") {
    return (
      <>
        <Copy title="Connect your wallet" message="You approve in your wallet. Vanna never holds your keys." />
        <View style={{ marginTop: 20 }}>
          <PillButton label="Use installed wallet" icon="account_balance_wallet" onPress={props.onConnect} />
        </View>
        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="lock" size={14} color={palette.dark.textMuted} />
          <AppText variant="caption" style={{ color: palette.dark.textMuted }}>
            Only your address is shared
          </AppText>
        </View>
      </>
    );
  }

  if (step === "install") {
    return (
      <>
        <Copy title="Get a Solana wallet" message="Vanna trades from a wallet app on your phone. Install one, then come back." />
        <View style={{ marginTop: 20, flexDirection: "row", gap: 10 }}>
          <PillButton label="Get Phantom" tone="tint" flex onPress={props.onInstallPhantom} />
          <PillButton label="Get Solflare" tone="tint" flex onPress={props.onInstallSolflare} />
        </View>
        {props.errorMessage ? (
          <AppText variant="caption" style={{ marginTop: 8, textAlign: "center", color: palette.dark.negative }}>
            {props.errorMessage}
          </AppText>
        ) : null}
        <View style={{ marginTop: 4 }}>
          <PillButton label="I have installed one" tone="quiet" height={44} onPress={props.onConnect} />
        </View>
      </>
    );
  }

  if (step === "approving") {
    return (
      <>
        <Copy title="Waiting for your wallet" message="Approve the request in your wallet to continue." />
        <Waiting />
      </>
    );
  }

  if (step === "connected") {
    return (
      <>
        <Copy title="Connected" message={props.walletName} />
        <AddressChip address={props.address} />
        <View style={{ marginTop: 18 }}>
          <PillButton label="Continue" tone="muted" height={44} onPress={props.onContinue} />
        </View>
      </>
    );
  }

  return (
    <>
      <Copy
        title={props.declinedByWallet ? "Cancelled in your wallet" : "Could not connect"}
        message={props.declinedByWallet ? "Nothing was connected." : props.errorMessage}
      />
      <View style={{ marginTop: 20 }}>
        <PillButton label="Try again" onPress={props.onRetry} />
      </View>
      <View style={{ marginTop: 4 }}>
        <PillButton label="Not now" tone="quiet" height={44} onPress={props.onDismiss} />
      </View>
    </>
  );
}

export function ConnectSheet(props: ConnectSheetProps) {
  const insets = useSafeAreaInsets();
  const step = stepOf(props);

  return (
    <View style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, justifyContent: "flex-end" }}>
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: palette.dark.scrim }}
      >
        <Pressable accessibilityLabel="Dismiss" onPress={step === "approving" ? undefined : props.onDismiss} style={{ flex: 1 }} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(340)}
        style={{
          backgroundColor: palette.dark.surface,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 10,
          paddingHorizontal: 22,
          paddingBottom: Math.max(insets.bottom, 12) + 16,
        }}
      >
        <View style={{ alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: palette.dark.border }} />
        <Animated.View key={step} entering={riseIn(6, 240, 120)} style={{ paddingTop: 20 }}>
          <Handshake mode={handshakeMode[step]} />
          <Body {...props} step={step} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}
