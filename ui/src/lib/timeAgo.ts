const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.round((now - then) / 1000);

  if (seconds < MINUTE) return "agora mesmo";
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return `há ${m}min`;
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return `há ${h}h`;
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return `há ${d}d`;
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return `há ${w}sem`;
  }
  const mo = Math.floor(seconds / MONTH);
  return `há ${mo}mês`;
}
