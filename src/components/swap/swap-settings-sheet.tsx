import { useState } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Notice } from "@/components/ui/notice";
import { OutlinedField } from "@/components/ui/outlined-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatUnits, parseUnits } from "@/format/format-amount";
import type { SwapSettings } from "@/types/swap";

const PRESETS = ["0.1", "0.5", "1.0"] as const;
const HIGH_SLIPPAGE_BPS = 100n;
const VERY_HIGH_SLIPPAGE_BPS = 500n;
const MAX_SLIPPAGE_BPS = 5_000n;
const MAX_DEADLINE_MINUTES = 1_440n;
const FIELD_GAP = 7;

type SwapSettingsSheetProps = {
  visible: boolean;
  settings: SwapSettings;
  autoSlippageBps: number;
  onSave: (settings: SwapSettings) => void;
  onDismiss: () => void;
};

export function SwapSettingsSheet({ visible, settings, autoSlippageBps, onSave, onDismiss }: SwapSettingsSheetProps) {
  return (
    <BottomSheet visible={visible} title="Swap settings" onDismiss={onDismiss}>
      <SettingsForm settings={settings} autoSlippageBps={autoSlippageBps} onSave={onSave} onDismiss={onDismiss} />
    </BottomSheet>
  );
}

type SettingsFormProps = Omit<SwapSettingsSheetProps, "visible">;

function SettingsForm({ settings, autoSlippageBps, onSave, onDismiss }: SettingsFormProps) {
  const [mode, setMode] = useState(settings.mode);
  const [slippageText, setSlippageText] = useState(formatUnits(BigInt(settings.customBps), 2, 1));
  const [deadlineText, setDeadlineText] = useState(String(settings.deadlineMinutes));

  const custom = mode === "custom";
  const customBps = parseUnits(slippageText, 2);
  const deadline = parseUnits(deadlineText, 0);
  const slippageValid = !custom || (customBps !== null && customBps > 0n && customBps <= MAX_SLIPPAGE_BPS);
  const deadlineValid = deadline !== null && deadline > 0n && deadline <= MAX_DEADLINE_MINUTES;
  const high = custom && customBps !== null && customBps >= HIGH_SLIPPAGE_BPS;
  const veryHigh = custom && customBps !== null && customBps >= VERY_HIGH_SLIPPAGE_BPS;

  const save = () => {
    if (deadline === null) return;
    onSave({
      mode,
      customBps: customBps !== null && customBps > 0n ? Number(customBps) : settings.customBps,
      deadlineMinutes: Number(deadline),
    });
    onDismiss();
  };

  return (
    <View>
      <AppText variant="body" strong>
        Slippage tolerance
      </AppText>
      <AppText variant="caption" color="textMuted">
        How far the price can move before the swap cancels itself.
      </AppText>
      <View style={{ marginTop: 12 }}>
        <SegmentedControl
          variant="buttons"
          dense
          segments={[
            { value: "auto", label: "Auto" },
            { value: "custom", label: "Custom" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
        {PRESETS.map((preset) => (
          <Chip
            key={preset}
            flex
            shape="pill"
            label={`${preset}%`}
            selected={custom && slippageText === preset}
            onPress={() => {
              setMode("custom");
              setSlippageText(preset);
            }}
          />
        ))}
      </View>
      <View style={{ marginTop: FIELD_GAP }}>
        <OutlinedField
          label="Custom slippage"
          suffix="%"
          editable={custom}
          error={custom && !slippageValid}
          value={custom ? slippageText : formatUnits(BigInt(autoSlippageBps), 2, 1)}
          onChangeText={setSlippageText}
        />
      </View>
      {high ? (
        <Notice
          tone={veryHigh ? "error" : "warning"}
          message={veryHigh ? "Very high slippage. You could lose a large part of this trade." : "High slippage can give you a worse price."}
        />
      ) : null}
      <AppText variant="body" strong style={{ marginTop: 20 }}>
        Transaction deadline
      </AppText>
      <AppText variant="caption" color="textMuted">
        Cancel the swap if it is still pending after this long.
      </AppText>
      <View style={{ marginTop: FIELD_GAP }}>
        <OutlinedField label="Deadline" suffix="min" keyboardType="number-pad" error={!deadlineValid} value={deadlineText} onChangeText={setDeadlineText} />
      </View>
      <View style={{ marginTop: 16 }}>
        <Button label="Save" disabled={!slippageValid || !deadlineValid} onPress={save} />
      </View>
    </View>
  );
}
