export function capUsageBps(used: bigint, cap: bigint): number {
  if (cap === 0n) return 0;
  return Number((used * 10_000n) / cap);
}
