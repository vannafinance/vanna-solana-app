// Placeholder data mirroring devnet values in design/; replaced by RPC reads.
import { getApprovalOutcome, previewApproval } from "@/lib/preview-data/approval-outcome";
import type { CollateralSymbol, FarmCollateral, FarmHistoryEntry, FarmPool, FarmPosition } from "@/types/farm";
import type { TransactionError } from "@/types/transaction";

const STEP_DELAY_MS = 1400;

export const farmPools: readonly FarmPool[] = [
  {
    symbol: "USDC",
    market: "Kamino Main Market",
    decimals: 6,
    priceUsd: 1_000_000n,
    supplyApyBps: 503,
    borrowApyBps: 65,
    available: 5_996_822_000_000n,
    totalSupplied: 121_554_426_000_000n,
    utilizationBps: 9506,
  },
  {
    symbol: "SOL",
    market: "Kamino Main Market",
    decimals: 9,
    priceUsd: 118_580_000n,
    supplyApyBps: 436,
    borrowApyBps: 116,
    available: 255_061_000_000_000n,
    totalSupplied: 2_480_112_000_000_000n,
    utilizationBps: 8970,
  },
];

const COLLATERAL_DECIMALS = 8;

export const farmCollaterals: readonly FarmCollateral[] = [
  { symbol: "TSLAx", decimals: COLLATERAL_DECIMALS, priceUsd: 353_592_000n, balance: 125_000_000n },
  { symbol: "GOOGLx", decimals: COLLATERAL_DECIMALS, priceUsd: 339_930_000n, balance: 0n },
  { symbol: "AAPLx", decimals: COLLATERAL_DECIMALS, priceUsd: 332_370_000n, balance: 0n },
  { symbol: "ANTHROPIC", decimals: COLLATERAL_DECIMALS, priceUsd: 1_042_770_000n, balance: 96_000_000n },
  { symbol: "OPENAI", decimals: COLLATERAL_DECIMALS, priceUsd: 2_117_090_000n, balance: 0n },
];

const listeners = new Set<() => void>();
let positions: readonly FarmPosition[] = [
  {
    id: "farm-googlx-usdc",
    collateralSymbol: "GOOGLx",
    poolSymbol: "USDC",
    leverage: 4,
    collateral: { raw: 150_000_000n, decimals: COLLATERAL_DECIMALS },
    collateralPriceUsd: 339_930_000n,
    principal: { raw: 1_529_700_000n, decimals: 6 },
    interest: { raw: 10_000n, decimals: 6 },
    supplied: { raw: 1_531_170_000n, decimals: 6 },
    poolPriceUsd: 1_000_000n,
    supplyApyBps: 503,
    borrowApyBps: 80,
  },
];
let nextPositionId = 1;

function emit() {
  listeners.forEach((listener) => listener());
}

export function getFarmPositions() {
  return positions;
}

export function subscribeFarmPositions(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function nextFarmPositionId(collateral: CollateralSymbol, pool: string) {
  nextPositionId += 1;
  return `farm-${collateral.toLowerCase()}-${pool.toLowerCase()}-${nextPositionId}`;
}

export function addFarmPosition(position: FarmPosition) {
  positions = [...positions, position];
  emit();
}

export function replaceFarmPosition(id: string, next: FarmPosition | null) {
  positions = next ? positions.map((position) => (position.id === id ? next : position)) : positions.filter((position) => position.id !== id);
  emit();
}

function wait() {
  return new Promise<void>((resolve) => setTimeout(resolve, STEP_DELAY_MS));
}

// A network failure stops the close before anything moved. Any other failure lands on step 2, after the loan is already repaid.
export async function previewCloseStep(step: number, partialFailure: TransactionError): Promise<void> {
  if (step === 1) {
    if (getApprovalOutcome() === "network") await previewApproval();
    else await wait();
    return;
  }
  await wait();
  if (getApprovalOutcome() !== "success") throw partialFailure;
}

export const farmClosedEarningsUsd = 7_590_000n;
export const farmClosedCount = 1;

export const farmHistory: readonly FarmHistoryEntry[] = [
  {
    id: "history-googlx-open",
    collateralSymbol: "GOOGLx",
    poolSymbol: "USDC",
    occurredAt: new Date(2026, 8, 21, 10, 42).getTime(),
    signature: "5tRqWn8vLm3TrWc4Hd8eYbZ5uFjA1sGoN6xKp3nQ2vLmGa81",
    actions: [
      { kind: "deposit", symbol: "GOOGLx", amount: { raw: 150_000_000n, decimals: COLLATERAL_DECIMALS } },
      { kind: "deposit", symbol: "USDC", amount: { raw: 1_529_700_000n, decimals: 6 } },
      { kind: "borrow", symbol: "USDC", amount: { raw: 1_529_700_000n, decimals: 6 } },
    ],
  },
  {
    id: "history-anthropic-close",
    collateralSymbol: "ANTHROPIC",
    poolSymbol: "USDC",
    occurredAt: new Date(2026, 8, 19, 16, 10).getTime(),
    signature: "9aKeLm3TrWc4Hd8eYbZ5uFjA1sGoN6xKp3nQ2vLm9Tq2mPw",
    actions: [
      { kind: "redeem", symbol: "USDC", amount: { raw: 2_008_240_000n, decimals: 6 } },
      { kind: "repay", symbol: "USDC", amount: { raw: 2_002_300_000n, decimals: 6 } },
      { kind: "withdraw", symbol: "ANTHROPIC", amount: { raw: 96_000_000n, decimals: COLLATERAL_DECIMALS } },
    ],
  },
  {
    id: "history-anthropic-open",
    collateralSymbol: "ANTHROPIC",
    poolSymbol: "USDC",
    occurredAt: new Date(2026, 8, 10, 9, 5).getTime(),
    signature: "3cVbLm3TrWc4Hd8eYbZ5uFjA1sGoN6xKp3nQ2vLm9Tq27hNs",
    actions: [
      { kind: "deposit", symbol: "ANTHROPIC", amount: { raw: 96_000_000n, decimals: COLLATERAL_DECIMALS } },
      { kind: "deposit", symbol: "USDC", amount: { raw: 2_002_120_000n, decimals: 6 } },
      { kind: "borrow", symbol: "USDC", amount: { raw: 2_002_120_000n, decimals: 6 } },
    ],
  },
];
