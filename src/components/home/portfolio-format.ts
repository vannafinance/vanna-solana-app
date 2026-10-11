import { formatSignedUsd } from "@/format/format-amount";
import type { NetWorthPart } from "@/types/portfolio";

const PART_LABEL: Record<NetWorthPart, string> = { wallet: "Wallet", earn: "Earn" };

const CAPTION_MAX = 50;

export function missingCaption(missing: readonly NetWorthPart[]): string {
  return `${missing.map((part) => PART_LABEL[part]).join(" and ")} unavailable · not counted`;
}

// One line of P&L: lending earnings (Earn) plus the open P&L of Perps and Farm (Trading). When one side cannot be read the
// other is named on its own rather than passed off as the total; when the full breakdown is too long only the total is kept.
export function pnlCaption(earn: bigint | null, trading: bigint | null): string {
  if (earn === null) return trading === null ? "P&L unavailable" : `Trading P&L ${formatSignedUsd(trading)}`;
  if (trading === null) return `Earn P&L ${formatSignedUsd(earn)}`;
  if (earn === 0n && trading === 0n) return "No P&L yet";
  const total = `P&L ${formatSignedUsd(earn + trading)}`;
  const full = `${total} · Earn ${formatSignedUsd(earn)} · Trading ${formatSignedUsd(trading)}`;
  return full.length <= CAPTION_MAX ? full : total;
}

// "USDC vault", "USDC and SOL vaults", "USDC, SOL and TSLAx vaults".
export function vaultNames(symbols: readonly string[]): string {
  if (symbols.length === 0) return "";
  if (symbols.length === 1) return `${symbols[0]} vault`;
  return `${symbols.slice(0, -1).join(", ")} and ${symbols[symbols.length - 1]} vaults`;
}
