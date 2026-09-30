import { ArrowUpRight, Backpack, Check, LockKey, Prohibit, WifiSlash, type Icon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { TokenIcon } from "@/components/ui/token-icon";
import { shortAddress } from "@/format/short-address";
import { useTheme } from "@/theme/use-theme";
import type { ConnectPhase } from "@/types/connection";

const MONO = { fontFamily: "monospace" } as const;

type ConnectSheetProps = {
  phase: ConnectPhase;
  installed: boolean;
  busy: boolean;
  walletName: string;
  address: string;
  rpcUrl: string;
  onConnect: () => void;
  onAuthorize: () => void;
  onCancel: () => void;
  onRetryAuthorize: () => void;
  onRpcAdded: () => void;
  onCheckAgain: () => void;
  onShowSetup: () => void;
  onCopyRpc: () => void;
  onSetupGuide: () => void;
  onContinue: () => void;
  onDismiss: () => void;
};

function Medallion({ background, children }: { background: string; children: ReactNode }) {
  const { radius } = useTheme();

  return (
    <View style={{ width: 80, height: 80, borderRadius: radius.pill, backgroundColor: background, alignItems: "center", justifyContent: "center" }}>
      {children}
    </View>
  );
}

function Headline({ title, message, children }: { title: string; message?: string; children?: ReactNode }) {
  return (
    <View style={{ gap: 8, alignItems: "center" }}>
      <AppText variant="heading" style={{ textAlign: "center" }}>
        {title}
      </AppText>
      {message ? (
        <AppText variant="bodyLg" color="textMuted" style={{ textAlign: "center" }}>
          {message}
          {children}
        </AppText>
      ) : null}
    </View>
  );
}

function WalletTile({ size = 44, icon: Glyph = Backpack }: { size?: number; icon?: Icon }) {
  const { colors } = useTheme();

  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: colors.negative, alignItems: "center", justifyContent: "center" }}>
      <Glyph size={size * 0.55} color={colors.onPrimary} weight="fill" />
    </View>
  );
}

function PickWallet({ installed, walletName, onConnect }: Pick<ConnectSheetProps, "installed" | "walletName" | "onConnect">) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Connect a wallet</AppText>
        <AppText variant="bodyLg" color="textMuted">
          Vanna connects through Solana Mobile Wallet Adapter. You approve everything in your wallet.
        </AppText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={installed ? `Connect ${walletName}` : `Install ${walletName}`}
        onPress={onConnect}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          padding: spacing.md,
          minHeight: 72,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <WalletTile size={44} />
        <View style={{ flex: 1 }}>
          <AppText variant="title">{walletName}</AppText>
          <AppText variant="body" color="textMuted">
            {installed ? "Detected on this phone" : "Not installed on this phone"}
          </AppText>
        </View>
        <Pill label={installed ? "Detected" : "Install"} tone={installed ? "teal" : "pink"} />
      </Pressable>
      <AppText variant="body" color="textMuted">
        Vanna supports Backpack today. More wallets are coming.
      </AppText>
      <View style={{ flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.background }}>
        <LockKey size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
        <AppText variant="body" color="textMuted" style={{ flex: 1 }}>
          Vanna only asks to see your address and to request signatures. Your keys never leave Backpack.
        </AppText>
      </View>
    </View>
  );
}

function Approving({ busy, walletName, onAuthorize, onCancel }: Pick<ConnectSheetProps, "busy" | "walletName" | "onAuthorize" | "onCancel">) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <View style={{ width: 126, height: 126, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
          <WalletTile size={84} />
        </View>
        <Headline title={`Approve in ${walletName}`} message={`${walletName} opened. Approve the connection there, then come back to Vanna.`} />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button label={`Open ${walletName}`} loading={busy} onPress={onAuthorize} />
        <Button label="Cancel" variant="text" onPress={onCancel} />
      </View>
    </View>
  );
}

function RpcSetup({ busy, walletName, rpcUrl, onRpcAdded, onCopyRpc, onSetupGuide }: Pick<ConnectSheetProps, "busy" | "walletName" | "rpcUrl" | "onRpcAdded" | "onCopyRpc" | "onSetupGuide">) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: spacing.sm }}>
        <Pill label="One-time setup" />
        <AppText variant="heading">{`Point ${walletName} to Vanna's network`}</AppText>
        <AppText variant="bodyLg" color="textMuted">
          {`Vanna runs on a Solana mainnet fork. In ${walletName}, open Settings → Solana → RPC → Custom and paste this address.`}
        </AppText>
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          paddingLeft: spacing.lg,
          paddingRight: spacing.sm,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <AppText variant="body" selectable style={[{ flex: 1 }, MONO]}>
          {rpcUrl}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Copy RPC address"
          onPress={onCopyRpc}
          style={{ minHeight: 44, paddingHorizontal: spacing.lg, borderRadius: radius.pill, backgroundColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}
        >
          <AppText variant="body" strong style={{ color: colors.onPurpleTint }}>
            Copy
          </AppText>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Setup guide"
        onPress={onSetupGuide}
        style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, alignSelf: "flex-start" }}
      >
        <AppText variant="bodyLg" strong color="link">
          Setup guide
        </AppText>
        <ArrowUpRight size={16} color={colors.link} />
      </Pressable>
      <Button label="I've added it" loading={busy} onPress={onRpcAdded} />
    </View>
  );
}

function Connected({ walletName, address, onContinue }: Pick<ConnectSheetProps, "walletName" | "address" | "onContinue">) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <View>
          <TokenIcon symbol="SOL" size={80} />
          <View
            style={{
              position: "absolute",
              right: -4,
              bottom: -4,
              width: 28,
              height: 28,
              borderRadius: radius.pill,
              backgroundColor: colors.positive,
              borderWidth: 2,
              borderColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Check size={16} color={colors.onPrimary} weight="bold" />
          </View>
        </View>
        <Headline title="You're connected" />
        <AppText variant="bodyLg" color="textMuted">
          <AppText variant="bodyLg" color="textMuted" style={MONO}>
            {shortAddress(address)}
          </AppText>
          {` · ${walletName}`}
        </AppText>
      </View>
      <Button label="Continue to Vanna" onPress={onContinue} />
    </View>
  );
}

function Failure({ icon: Glyph, tone, title, message, mono, primary, onPrimary, secondary, onSecondary }: {
  icon: Icon;
  tone: "negative" | "neutral";
  title: string;
  message: string;
  mono?: string;
  primary: string;
  onPrimary: () => void;
  secondary?: string;
  onSecondary?: () => void;
}) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <Medallion background={tone === "negative" ? colors.negative : colors.textMuted}>
          <Glyph size={44} color={colors.onPrimary} weight="bold" />
        </Medallion>
        <Headline title={title} message={message}>
          {mono ? <AppText variant="bodyLg" style={MONO}>{mono}</AppText> : null}
        </Headline>
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button label={primary} onPress={onPrimary} />
        {secondary && onSecondary ? <Button label={secondary} variant="text" onPress={onSecondary} /> : null}
      </View>
    </View>
  );
}

export function ConnectSheet(props: ConnectSheetProps) {
  const { phase, walletName, rpcUrl } = props;

  return (
    <BottomSheet visible onDismiss={phase === "pick" ? props.onDismiss : props.onCancel} dismissable={!props.busy}>
      {phase === "pick" ? <PickWallet installed={props.installed} walletName={walletName} onConnect={props.onConnect} /> : null}
      {phase === "approving" ? <Approving busy={props.busy} walletName={walletName} onAuthorize={props.onAuthorize} onCancel={props.onCancel} /> : null}
      {phase === "rpc-setup" ? (
        <RpcSetup busy={props.busy} walletName={walletName} rpcUrl={rpcUrl} onRpcAdded={props.onRpcAdded} onCopyRpc={props.onCopyRpc} onSetupGuide={props.onSetupGuide} />
      ) : null}
      {phase === "connected" ? <Connected walletName={walletName} address={props.address} onContinue={props.onContinue} /> : null}
      {phase === "declined" ? (
        <Failure
          icon={Prohibit}
          tone="neutral"
          title="Connection declined"
          message={`${walletName} didn't share your address. Nothing was connected.`}
          primary="Try again"
          onPrimary={props.onRetryAuthorize}
        />
      ) : null}
      {phase === "rpc-not-set" ? (
        <Failure
          icon={WifiSlash}
          tone="negative"
          title="Can't reach Vanna's network"
          message={`${walletName} is still on another RPC, so Vanna can't see your account. Check the custom RPC is exactly `}
          mono={rpcUrl.replace("https://", "")}
          primary="Check again"
          onPrimary={props.onCheckAgain}
          secondary="Show setup steps"
          onSecondary={props.onShowSetup}
        />
      ) : null}
    </BottomSheet>
  );
}
