import { X } from "phosphor-react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { Notice } from "@/components/ui/notice";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatUnits, parseUnits } from "@/format/format-amount";
import { useTheme } from "@/theme/use-theme";
import type { SwapSettings } from "@/types/swap";

const PRESETS = ["0.1", "0.5", "1.0"] as const;
const HIGH_SLIPPAGE_BPS = 100n;
const VERY_HIGH_SLIPPAGE_BPS = 500n;
const MAX_SLIPPAGE_BPS = 5_000n;
const MAX_DEADLINE_MINUTES = 1_440n;

type SwapSettingsSheetProps = {
  visible: boolean;
  settings: SwapSettings;
  autoSlippageBps: number;
  onSave: (settings: SwapSettings) => void;
  onDismiss: () => void;
};

export function SwapSettingsSheet({ visible, settings, autoSlippageBps, onSave, onDismiss }: SwapSettingsSheetProps) {
  return (
    <BottomSheet visible={visible} onDismiss={onDismiss}>
      <SettingsForm settings={settings} autoSlippageBps={autoSlippageBps} onSave={onSave} onDismiss={onDismiss} />
    </BottomSheet>
  );
}

type SettingsFormProps = Omit<SwapSettingsSheetProps, "visible">;

function SettingsForm({ settings, autoSlippageBps, onSave, onDismiss }: SettingsFormProps) {
  const { colors, fontFamily, fontSize, radius, spacing } = useTheme();
  const [mode, setMode] = useState(settings.mode);
  const [slippageText, setSlippageText] = useState(formatUnits(BigInt(settings.customBps), 2, 1));
  const [deadlineText, setDeadlineText] = useState(String(settings.deadlineMinutes));

  const custom = mode === "custom";
  const customBps = parseUnits(slippageText, 2);
  const deadline = parseUnits(deadlineText, 0);
  const slippageValid = !custom || (customBps !== null && customBps > 0n && customBps <= MAX_SLIPPAGE_BPS);
  const deadlineValid = deadline !== null && deadline > 0n && deadline <= MAX_DEADLINE_MINUTES;
  const warning =
    custom && customBps !== null && customBps >= HIGH_SLIPPAGE_BPS
      ? customBps >= VERY_HIGH_SLIPPAGE_BPS
        ? "Very high slippage. You could lose a large part of this trade."
        : "High slippage can give you a worse price."
      : null;

  const save = () => {
    if (deadline === null) return;
    onSave({
      mode,
      customBps: customBps !== null && customBps > 0n ? Number(customBps) : settings.customBps,
      deadlineMinutes: Number(deadline),
    });
    onDismiss();
  };

  const fieldStyle = {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.segment,
    borderWidth: 1,
  } as const;
  const inputStyle = { flex: 1, padding: 0, fontSize: fontSize.title, fontFamily: fontFamily.semibold, color: colors.text } as const;

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <AppText variant="heading">Swap settings</AppText>
        <IconButton icon={X} label="Close" tone="glass" color="text" onPress={onDismiss} />
      </View>

      <View style={{ gap: spacing.md }}>
        <View>
          <AppText variant="bodyLg" strong>
            Slippage tolerance
          </AppText>
          <AppText variant="body" color="textMuted">
            How far the price can move before the swap cancels itself.
          </AppText>
        </View>
        <SegmentedControl
          segments={[
            { value: "auto", label: "Auto" },
            { value: "custom", label: "Custom" },
          ]}
          value={mode}
          onChange={setMode}
        />
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {PRESETS.map((preset) => (
            <Chip
              key={preset}
              flex
              label={`${preset}%`}
              selected={custom && slippageText === preset}
              onPress={() => {
                setMode("custom");
                setSlippageText(preset);
              }}
            />
          ))}
        </View>
        <View style={[fieldStyle, { borderColor: custom ? (slippageValid ? colors.primary : colors.negative) : colors.border, opacity: custom ? 1 : 0.5 }]}>
          <TextInput
            accessibilityLabel="Custom slippage percent"
            editable={custom}
            keyboardType="decimal-pad"
            value={custom ? slippageText : formatUnits(BigInt(autoSlippageBps), 2, 1)}
            onChangeText={setSlippageText}
            style={inputStyle}
          />
          <AppText variant="bodyLg" color="textMuted">
            %
          </AppText>
        </View>
        {warning ? <Notice tone="error" message={warning} /> : null}
      </View>

      <View style={{ gap: spacing.md }}>
        <View>
          <AppText variant="bodyLg" strong>
            Transaction deadline
          </AppText>
          <AppText variant="body" color="textMuted">
            Cancel the swap if it is still pending after this long.
          </AppText>
        </View>
        <View style={[fieldStyle, { borderColor: deadlineValid ? colors.border : colors.negative }]}>
          <TextInput
            accessibilityLabel="Transaction deadline in minutes"
            keyboardType="number-pad"
            value={deadlineText}
            onChangeText={setDeadlineText}
            style={inputStyle}
          />
          <AppText variant="bodyLg" color="textMuted">
            min
          </AppText>
        </View>
      </View>

      <Button label="Save" disabled={!slippageValid || !deadlineValid} onPress={save} />
    </View>
  );
}
