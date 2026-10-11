import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, ClipboardList, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { phonesMatch } from '../../lib/phone';
import type { RequestStatus, User } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { NotificationsPanel } from '../../components/NotificationsPanel';
import { ProduceImage } from '../../components/ProduceImage';
import { EmptyState, ErrorState, PageHeader, RequestStatusBadge, Spinner, TabBar, VerifiedBadge } from '../../components/ui';

type Tab = 'requests' | 'profile' | 'notifications';
const TAB_IDS: Tab[] = ['requests', 'profile', 'notifications'];

const STATUS_HELP: Record<RequestStatus, string> = {
  Pending: 'Waiting for the farmer to reply.',
  Available: 'The farmer has this ready for you.',
  'Partially available': 'The farmer has some of what you asked for.',
  'Not available': 'The farmer cannot supply this right now.',
  Completed: 'This request is complete.',
};

function RequestsTab({ user }: { user: User }) {
  const requests = useAsync((signal) => api.listRequests(signal), []);
  const produce = useAsync((signal) => api.listProduce({}, signal), []);

  if (requests.error && !requests.data) return <ErrorState message={requests.error} onRetry={requests.reload} />;
  if (!requests.data) return <Spinner label="Loading your requests" />;

  const mine = requests.data.filter((r) => phonesMatch(r.buyerPhone, user.phone));
  const byId = new Map((produce.data ?? []).map((p) => [p.id, p]));
  const waiting = mine.filter((r) => r.status === 'Pending').length;
  const answered = mine.filter((r) => r.status === 'Available' || r.status === 'Partially available').length;

  if (mine.length === 0) {
    return (
      <EmptyState title="No requests yet" text="Find produce you need and send the farmer a request.">
        <Link to="/" className="btn btn-primary">
          Browse produce
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
        {(
          [
            ['Requests', mine.length],
            ['Waiting', waiting],
            ['Can supply', answered],
          ] as [string, number][]
        ).map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>

      <ul className="mt-6 space-y-4">
        {mine.map((r) => {
          const item = byId.get(r.produceId);
          const canCall = item && (r.status === 'Available' || r.status === 'Partially available');
          return (
            <li key={r.id} className="card flex gap-4 p-4 sm:p-5">
              {item && (
                <ProduceImage
                  src={item.image}
                  alt=""
                  category={item.category}
                  width={96}
                  height={96}
                  className="hidden h-24 w-24 shrink-0 rounded-md sm:block"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {item ? (
                      <Link to={`/produce/${item.id}`} className="hover:underline">
                        {r.produceTitle}
                      </Link>
                    ) : (
                      r.produceTitle
                    )}
                  </h3>
                  <RequestStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-ink">
                  You asked for {r.quantityRequested} {r.unit}
                  {r.offerPrice ? ` at ₦${r.offerPrice.toLocaleString()} each` : ''} · {formatDateTime(r.createdAt)}
                </p>
                <p className="mt-1 text-sm text-muted">{STATUS_HELP[r.status]}</p>
                {r.farmerResponseNotes && (
                  <p className="mt-2 rounded-md bg-sand p-3 text-sm text-ink">
                    <span className="font-semibold">Farmer says:</span> {r.farmerResponseNotes}
                  </p>
                )}
                {canCall && (
                  <a
                    href={`tel:${item.farmerPhone.replace(/\s/g, '')}`}
                    className="btn btn-outline btn-sm mt-3"
                  >
                    Call {item.farmerName}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function ProfileTab({ user }: { user: User }) {
  const rows: [string, string][] = [
    ['Name', user.name],
    ['Phone number', user.phone],
    ['Email', user.email || '—'],
    ['Location', user.location],
    ['Business', user.farmOrBusinessName || '—'],
    ['Produce you buy', user.cropsOrInterests || '—'],
    ['Joined', formatDate(user.registeredDate)],
  ];
  return (
    <section className="card max-w-2xl p-5 sm:p-6" aria-labelledby="profile-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="profile-title" className="font-display text-2xl font-semibold text-ink">
          Buyer profile
        </h2>
        {user.verified ? (
          <VerifiedBadge label="Verified buyer" />
        ) : (
          <span className="rounded-full bg-warn-bg px-3 py-1 text-xs font-semibold text-warn">Waiting for verification</span>
        )}
      </div>
      <dl className="mt-5 divide-y divide-line/70 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-3">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default function BuyerDashboard() {
  useTitle('Buyer portal');
  const { user, refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TAB_IDS.find((t) => t === requested) ?? 'requests';

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!user) return null;

  return (
    <div className="wrap pb-14 pt-10">
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        subtitle="Track your purchase requests and see what farmers have replied."
        action={
          <div className="flex gap-2">
            <Link to="/" className="btn btn-primary">
              Browse produce
            </Link>
            <Link to="/trace" className="btn btn-outline">
              Trace produce
            </Link>
          </div>
        }
      />
      <div className="mt-6">
        <TabBar<Tab>
          label="Buyer sections"
          active={tab}
          onChange={(id) => setParams(id === 'requests' ? {} : { tab: id }, { replace: true })}
          tabs={[
            { id: 'requests', label: 'My requests', icon: <ClipboardList className="h-4 w-4" aria-hidden /> },
            { id: 'profile', label: 'Profile', icon: <UserRound className="h-4 w-4" aria-hidden /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" aria-hidden /> },
          ]}
        />
      </div>
      <div className="mt-6">
        {tab === 'requests' && <RequestsTab user={user} />}
        {tab === 'profile' && <ProfileTab user={user} />}
        {tab === 'notifications' && <NotificationsPanel role="Buyer" />}
      </div>
      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Notifications are shared by all buyers.
      </p>
    </div>
  );
}
