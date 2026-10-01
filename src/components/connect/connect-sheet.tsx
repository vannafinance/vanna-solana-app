import { Wallet, Check, Prohibit, type Icon } from "phosphor-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { TokenIcon } from "@/components/ui/token-icon";
import { shortAddress } from "@/format/short-address";
import { useTheme } from "@/theme/use-theme";
import type { ConnectPhase } from "@/types/connection";

const MONO = { fontFamily: "monospace" } as const;

type ConnectSheetProps = {
  phase: ConnectPhase;
  walletMissing: boolean;
  busy: boolean;
  walletName: string;
  address: string;
  errorMessage?: string;
  onConnect: () => void;
  onInstallPhantom: () => void;
  onInstallSolflare: () => void;
  onAuthorize: () => void;
  onCancel: () => void;
  onRetryAuthorize: () => void;
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

function WalletTile({ size = 44, icon: Glyph = Wallet }: { size?: number; icon?: Icon }) {
  const { colors } = useTheme();

  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: colors.negative, alignItems: "center", justifyContent: "center" }}>
      <Glyph size={size * 0.55} color={colors.onPrimary} weight="fill" />
    </View>
  );
}

function PickWallet({ walletMissing, errorMessage, onConnect, onInstallPhantom, onInstallSolflare }: Pick<ConnectSheetProps, "walletMissing" | "errorMessage" | "onConnect" | "onInstallPhantom" | "onInstallSolflare">) {
  const { spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <AppText variant="heading">Connect wallet</AppText>
      {walletMissing ? <AppText variant="body" color="textMuted">No wallet found. Install a wallet to continue.</AppText> : null}
      <Button label={walletMissing ? "Try again" : "Connect wallet"} icon={Wallet} onPress={onConnect} />
      {walletMissing ? (
        <View style={{ gap: spacing.sm }}>
          <Button label="Install Phantom" variant="outline" onPress={onInstallPhantom} />
          <Button label="Install Solflare" variant="outline" onPress={onInstallSolflare} />
        </View>
      ) : null}
      {errorMessage ? <AppText variant="body" color="negative">{errorMessage}</AppText> : null}
    </View>
  );
}

function Approving({ busy, onAuthorize, onCancel }: Pick<ConnectSheetProps, "busy" | "walletName" | "onAuthorize" | "onCancel">) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ alignItems: "center", gap: spacing.md }}>
        <View style={{ width: 126, height: 126, borderRadius: radius.pill, borderWidth: 2, borderColor: colors.purpleTint, alignItems: "center", justifyContent: "center" }}>
          <WalletTile size={84} />
        </View>
        <Headline title="Approve in your wallet" message="Confirm the connection in your wallet." />
      </View>
      <View style={{ gap: spacing.sm }}>
        <Button label="Waiting for wallet" loading={busy} onPress={onAuthorize} />
        <Button label="Cancel" variant="text" disabled={busy} onPress={onCancel} />
      </View>
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
  const { phase, walletName } = props;

  return (
    <BottomSheet visible onDismiss={phase === "pick" ? props.onDismiss : props.onCancel} dismissable={!props.busy}>
      {phase === "pick" ? <PickWallet walletMissing={props.walletMissing} errorMessage={props.errorMessage} onConnect={props.onConnect} onInstallPhantom={props.onInstallPhantom} onInstallSolflare={props.onInstallSolflare} /> : null}
      {phase === "approving" ? <Approving busy={props.busy} walletName={walletName} onAuthorize={props.onAuthorize} onCancel={props.onCancel} /> : null}
      {phase === "connected" ? <Connected walletName={walletName} address={props.address} onContinue={props.onContinue} /> : null}
      {phase === "declined" ? (
        <Failure
          icon={Prohibit}
          tone="neutral"
          title="Could not connect"
          message={props.errorMessage ?? "Unlock your wallet and try again."}
          primary="Try again"
          onPrimary={props.onRetryAuthorize}
        />
      ) : null}
    </BottomSheet>
  );
}
