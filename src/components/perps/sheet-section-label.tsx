import { AppText } from "@/components/ui/app-text";

type SheetSectionLabelProps = { label: string };

export function SheetSectionLabel({ label }: SheetSectionLabelProps) {
  return (
    <AppText variant="caption" strong color="textMuted" style={{ letterSpacing: 0.5 }}>
      {label.toUpperCase()}
    </AppText>
  );
}
