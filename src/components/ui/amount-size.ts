// The size of an amount typed into a field. A long number in a narrow field (a wide token name sits beside it) used to be cut off at
// the edge, so the figure steps down as it grows and always stays whole. The system font setting is not applied to these fields
// (`maxFontSizeMultiplier={1}`): their size is set here.
export function amountFontSize(text: string, base: number): { fontSize: number; lineHeight: number } {
  const length = text.length;
  const factor = length <= 7 ? 1 : length <= 9 ? 0.85 : length <= 11 ? 0.72 : 0.6;
  const fontSize = Math.round(base * factor);
  return { fontSize, lineHeight: Math.round(base * 1.25) };
}
