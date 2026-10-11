/** Turns an ISO timestamp into "Just now", "3 hours ago", "1 day ago", etc. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - 3600000 * hours).toISOString();
}
