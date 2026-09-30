import { formatUnits } from "@/format/format-amount";

const BPS = 10_000n;
const INPUT_DIGITS = 2;

export function fractionOfBalance(balance: bigint, decimals: number, fraction: number): string {
  const share = (balance * BigInt(Math.round(fraction * Number(BPS)))) / BPS;
  const step = 10n ** BigInt(Math.max(decimals - INPUT_DIGITS, 0));
  return formatUnits(share - (share % step), decimals, INPUT_DIGITS);
}
