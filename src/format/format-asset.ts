import { formatSignedPercent, formatToken, formatUsd, type TokenAmount } from "./format-amount";

function unitPrice(tokens: TokenAmount, value: bigint) {
  return tokens.raw === 0n ? 0n : (value * 10n ** BigInt(tokens.decimals)) / tokens.raw;
}

export function assetDetail(symbol: string, tokens: TokenAmount, value: bigint) {
  if (symbol === "USDC") return "Stablecoin";
  return `${formatToken(tokens, 2)} · ${formatUsd(unitPrice(tokens, value))}`;
}

export function changeToday(bps: number) {
  const text = formatSignedPercent(bps, 1).replace("-", "−");
  return `${text} today`;
}
