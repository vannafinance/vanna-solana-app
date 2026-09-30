const EDGE = 4;

export function shortAddress(address: string): string {
  return address.length <= EDGE * 2 + 1 ? address : `${address.slice(0, EDGE)}…${address.slice(-EDGE)}`;
}
