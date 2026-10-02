const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Oct 2" from a unix time in seconds, in the device's time zone.
export function formatShortDate(seconds: number): string {
  const date = new Date(seconds * 1000);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
