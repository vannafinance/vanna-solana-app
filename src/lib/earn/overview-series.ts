export function scaleSeries(levels: readonly number[], endValue: bigint, endLevel: number): bigint[] {
  return levels.map((level) => (endValue * BigInt(level)) / BigInt(endLevel));
}
