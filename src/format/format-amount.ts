const USD_DECIMALS = 6;

export type TokenAmount = { raw: bigint; decimals: number };

function groupThousands(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatUnits(raw: bigint, decimals: number, fractionDigits: number): string {
  const negative = raw < 0n;
  const magnitude = negative ? -raw : raw;
  const drop = decimals - fractionDigits;
  const scaled = drop > 0 ? (magnitude + 10n ** BigInt(drop) / 2n) / 10n ** BigInt(drop) : magnitude * 10n ** BigInt(-drop);
  const digits = scaled.toString().padStart(fractionDigits + 1, "0");
  const whole = groupThousands(digits.slice(0, digits.length - fractionDigits));
  const fraction = fractionDigits > 0 ? `.${digits.slice(digits.length - fractionDigits)}` : "";
  return `${negative ? "-" : ""}${whole}${fraction}`;
}

export function formatUsd(raw: bigint, decimals = USD_DECIMALS): string {
  const text = formatUnits(raw, decimals, 2);
  return text.startsWith("-") ? `-$${text.slice(1)}` : `$${text}`;
}

export function formatUsdOrDash(raw: bigint | null, decimals = USD_DECIMALS): string {
  return raw === null ? "—" : formatUsd(raw, decimals);
}

export function formatSignedUsd(raw: bigint, decimals = USD_DECIMALS): string {
  return raw > 0n ? `+${formatUsd(raw, decimals)}` : formatUsd(raw, decimals);
}

// Display only: precision above 2^53 base units is irrelevant at K/M granularity.
export function formatCompactUsd(raw: bigint, decimals = USD_DECIMALS): string {
  const value = Number(raw) / 10 ** decimals;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return formatUsd(raw, decimals);
}

export function formatToken(amount: TokenAmount, fractionDigits = 4): string {
  return formatUnits(amount.raw, amount.decimals, fractionDigits);
}

export function formatPercent(basisPoints: number, fractionDigits = 2): string {
  return `${(basisPoints / 100).toFixed(fractionDigits)}%`;
}

export function formatSignedPercent(basisPoints: number, fractionDigits = 2): string {
  return `${basisPoints > 0 ? "+" : ""}${formatPercent(basisPoints, fractionDigits)}`;
}

export function parseUnits(text: string, decimals: number): bigint | null {
  const cleaned = text.replace(/,/g, "").trim();
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") return null;
  const [whole = "0", fraction = ""] = cleaned.split(".");
  const padded = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}
