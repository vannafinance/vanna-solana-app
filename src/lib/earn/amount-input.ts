export function sanitizeAmountInput(text: string, decimals: number): string | null {
  const cleaned = text.replace(/,/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned)) return null;
  const fraction = cleaned.split(".")[1] ?? "";
  return fraction.length > decimals ? null : cleaned;
}

export function toInputText(raw: bigint, decimals: number): string {
  const digits = raw.toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}
