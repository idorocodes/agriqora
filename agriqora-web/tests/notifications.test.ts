import { afterEach, describe, expect, it, vi } from 'vitest';
import { isNewNotification, markNotificationsSeen } from '../src/lib/notifications';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('notification seen state', () => {
  it('tracks seen notifications separately for each account with the same role', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
      dispatchEvent: vi.fn(),
    });
    const notification = {
      id: 'notification-1',
      userRole: 'Farmer' as const,
      title: 'Buyer request',
      message: 'A buyer sent a request.',
      createdAt: new Date(Date.now() - 1_000).toISOString(),
      read: false,
      timestamp: 'just now',
    };

    markNotificationsSeen('Farmer', 'farmer-1');

    expect(isNewNotification(notification, 'Farmer', 'farmer-1')).toBe(false);
    expect(isNewNotification(notification, 'Farmer', 'farmer-2')).toBe(true);
  });
});