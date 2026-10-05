const MINUTE = 60_000;

// How old the data on screen is when the latest refresh failed: the time between the last good read and the failure. When
// nothing was ever read (the timestamp is 0) there is no age to show, and subtracting from 0 would read as decades.
export function staleMinutesOf(dataUpdatedAt: number, errorUpdatedAt: number): number | undefined {
  if (dataUpdatedAt <= 0) return undefined;
  return Math.max(Math.floor((errorUpdatedAt - dataUpdatedAt) / MINUTE), 0);
}
