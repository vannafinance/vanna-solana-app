import type { TokenAmount } from "@/format/format-amount";

const MIN_FRACTION_DIGITS = 2;

export function toInputText({ raw, decimals }: TokenAmount): string {
  const digits = raw.toString().padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, "").padEnd(MIN_FRACTION_DIGITS, "0");
  return `${whole}.${fraction}`;
}
