import type { AppNotification, NotificationRole } from './types';

// The API keeps one shared notification list per ROLE and has no "mark as read"
// endpoint, so "new" is tracked in this browser: anything newer than the last
// time the user opened their notifications.
const key = (role: NotificationRole, userId?: string) => `agriqora.notificationsSeen.${userId ?? role}`;
const EVENT = 'agriqora:notifications-seen';

function readSeen(role: NotificationRole, userId?: string): number {
  try {
    return Number(window.localStorage.getItem(key(role, userId))) || 0;
  } catch {
    return 0;
  }
}

export function markNotificationsSeen(role: NotificationRole, userId?: string): void {
  try {
    window.localStorage.setItem(key(role, userId), String(Date.now()));
  } catch {
    /* storage unavailable: counts simply stay as they are */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function isNewNotification(n: AppNotification, role: NotificationRole, userId?: string): boolean {
  return new Date(n.createdAt).getTime() > readSeen(role, userId);
}

export function countNewNotifications(list: AppNotification[], role: NotificationRole, userId?: string): number {
  return list.filter((n) => isNewNotification(n, role, userId)).length;
}

export function onNotificationsSeen(handler: () => void): () => void {
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
