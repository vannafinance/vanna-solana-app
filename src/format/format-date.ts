const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Oct 2" from a unix time in seconds, in the device's time zone.
export function formatShortDate(seconds: number): string {
  const date = new Date(seconds * 1000);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

// "Oct 2, 5:31 PM" from a unix time in seconds, in the device's time zone.
export function formatDateTime(seconds: number): string {
  const date = new Date(seconds * 1000);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}
