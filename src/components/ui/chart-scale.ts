export function niceTicks(low: number, high: number, count: number): number[] {
  const top = high === low ? low + 1 : high;
  const span = top - low;
  const roughStep = 10 ** Math.floor(Math.log10(span / count));
  const error = span / count / roughStep;
  const step = roughStep * (error >= 7.5 ? 10 : error >= 3.5 ? 5 : error >= 1.5 ? 2 : 1);
  const ticks: number[] = [];
  for (let tick = Math.floor(low / step) * step; tick <= top + step * 0.5; tick += step) ticks.push(Number(tick.toFixed(10)));
  return ticks;
}

export function nearestIndex(positions: readonly number[], target: number): number {
  let best = 0;
  for (let index = 1; index < positions.length; index++) {
    if (Math.abs(positions[index] - target) < Math.abs(positions[best] - target)) best = index;
  }
  return best;
}
