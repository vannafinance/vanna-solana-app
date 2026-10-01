import { AppText } from "@/components/ui/app-text";

type SheetSectionLabelProps = { label: string };

export function SheetSectionLabel({ label }: SheetSectionLabelProps) {
  return (
    <AppText variant="caption" strong color="textMuted" style={{ marginTop: 18, letterSpacing: 0.48 }}>
      {label.toUpperCase()}
    </AppText>
  );
}
