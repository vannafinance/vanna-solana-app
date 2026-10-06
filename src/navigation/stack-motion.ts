// How a detail screen (a market, an order, a vault, a position) opens over its page: it slides in from the right with a slight shift of
// the page beneath, and Back plays the same motion in reverse. Every stack uses this so opening anything feels the same.
export const detailMotion = { animation: "ios_from_right" } as const;
