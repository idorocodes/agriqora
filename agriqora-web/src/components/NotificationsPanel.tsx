import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useAsync } from '../lib/hooks';
import { isNewNotification, markNotificationsSeen } from '../lib/notifications';
import type { NotificationRole } from '../lib/types';
import { Badge, EmptyState, ErrorState, Spinner } from './ui';

/** Lists notifications for a role and marks them as seen once they have been shown. */
export function NotificationsPanel({ role }: { role: NotificationRole }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { data, error, reload } = useAsync((signal) => api.listNotifications(role, signal), [role]);
  const [newIds, setNewIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!data || newIds) return;
    setNewIds(new Set(data.filter((n) => isNewNotification(n, role, userId)).map((n) => n.id)));
    markNotificationsSeen(role, userId);
  }, [data, newIds, role, userId]);

  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Spinner label="Loading notifications" />;
  if (data.length === 0) return <EmptyState compact title="No notifications yet" text="Updates will show up here." />;

  return (
    <ul className="space-y-3">
      {data.map((n) => (
        <li key={n.id} className="card flex gap-3 p-4">
          <Bell className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-ink">{n.title}</p>
              {newIds?.has(n.id) && <Badge tone="green">New</Badge>}
            </div>
            <p className="mt-0.5 text-sm text-ink/85">{n.message}</p>
            <p className="mt-1 text-xs text-muted">{n.timestamp}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
