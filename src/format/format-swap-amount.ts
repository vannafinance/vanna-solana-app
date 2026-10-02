import { formatPercent, formatUnits } from "./format-amount";

const STABLE_DIGITS = 2;
const VOLATILE_DIGITS = 4;
const MIN_DIGITS = 2;

export function formatSwapAmount(raw: bigint, decimals: number, symbol: string): string {
  if (raw === 0n) return "0";
  if (symbol === "USDC" || raw >= 100n * 10n ** BigInt(decimals)) return formatUnits(raw, decimals, STABLE_DIGITS);
  const [whole, fraction = ""] = formatUnits(raw, decimals, VOLATILE_DIGITS).split(".");
  const trimmed = fraction.replace(/0+$/, "").padEnd(MIN_DIGITS, "0");
  return `${whole}.${trimmed}`;
}

export function formatPriceImpact(basisPoints: number): string {
  return basisPoints === 0 ? "< 0.01%" : formatPercent(basisPoints);
}

export function formatSlippage(basisPoints: number, auto: boolean): string {
  const percent = formatPercent(basisPoints, basisPoints % 10 === 0 ? 1 : 2);
  return auto ? `Auto · ${percent}` : percent;
}
