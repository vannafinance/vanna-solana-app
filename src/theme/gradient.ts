export type GradientStop = readonly [color: string, position: number];

export type Gradient = {
  colors: readonly [string, string, ...string[]];
  locations: readonly [number, number, ...number[]];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

// CSS 155deg: the gradient line runs top-left to bottom-right, steeper than 45deg.
const DIAGONAL = { start: { x: 0.29, y: 0 }, end: { x: 0.71, y: 1 } } as const;

function channel(hex: string, offset: number) {
  return parseInt(hex.slice(offset, offset + 2), 16);
}

function mix(from: string, to: string, t: number) {
  return `#${[1, 3, 5]
    .map((offset) => Math.round(channel(from, offset) + (channel(to, offset) - channel(from, offset)) * t))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function colorAt(stops: readonly GradientStop[], at: number) {
  const next = stops.findIndex(([, position]) => position >= at);
  if (next <= 0) return stops[Math.max(next, 0)][0];
  const [fromColor, fromPos] = stops[next - 1];
  const [toColor, toPos] = stops[next];
  return mix(fromColor, toColor, (at - fromPos) / (toPos - fromPos));
}

// Design stops can sit outside 0..1 (for example -25%); clip them and recolour the edges.
export function diagonalGradient(stops: readonly GradientStop[]): Gradient {
  const inside = stops.filter(([, position]) => position > 0 && position < 1);
  const all = [[colorAt(stops, 0), 0], ...inside, [colorAt(stops, 1), 1]] as const;
  return {
    colors: all.map(([color]) => color) as unknown as Gradient["colors"],
    locations: all.map(([, position]) => position) as unknown as Gradient["locations"],
    ...DIAGONAL,
  };
}
