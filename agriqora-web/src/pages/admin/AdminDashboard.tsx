import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bell, ClipboardList, LayoutDashboard, Megaphone, ScrollText, ShieldCheck, Sprout, Users } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime, shortHash } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { PRODUCE_STATUSES, type ProduceStatus, type User } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { NotificationsPanel } from '../../components/NotificationsPanel';
import { useToast } from '../../components/Toast';
import {
  Badge,
  EmptyState,
  ErrorState,
  InlineMessage,
  PageHeader,
  RequestStatusBadge,
  SelectField,
  Spinner,
  TabBar,
  TextAreaField,
  TextField,
  VerifiedBadge,
} from '../../components/ui';

type Tab = 'overview' | 'users' | 'listings' | 'requests' | 'ledger' | 'announcements' | 'notifications';
const TAB_IDS: Tab[] = ['overview', 'users', 'listings', 'requests', 'ledger', 'announcements', 'notifications'];

function Overview() {
  const stats = useAsync((signal) => api.adminStats(signal), []);
  if (stats.error && !stats.data) return <ErrorState message={stats.error} onRetry={stats.reload} />;
  if (!stats.data) return <Spinner label="Loading platform stats" />;
  const s = stats.data;
  const tiles: [string, string | number][] = [
    ['Farmers', s.totalFarmers],
    ['Buyers', s.totalBuyers],
    ['Listings', s.totalListings],
    ['Active listings', s.activeListings],
    ['Buyer requests', s.totalRequests],
    ['Platform audit blocks', s.blockchainRecordsCount],
    ['Verified farmers', `${s.verifiedFarmersPercent}%`],
  ];
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="mt-1 font-display text-3xl font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="top-crops">
          <h2 id="top-crops" className="font-display text-xl font-semibold text-ink">Top crops</h2>
          {s.topCrops.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No listings yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line/70 text-sm">
              {s.topCrops.map((c) => (
                <li key={c.crop} className="flex justify-between gap-3 py-2.5">
                  <span className="font-medium text-ink">{c.crop}</span>
                  <span className="text-muted">
                    {c.listings} {c.listings === 1 ? 'listing' : 'listings'} · {c.volume}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5" aria-labelledby="recent-blocks">
          <h2 id="recent-blocks" className="font-display text-xl font-semibold text-ink">Recent platform audit blocks</h2>
          {s.recentBlocks.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No blocks yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line/70 text-sm">
              {s.recentBlocks.map((b) => (
                <li key={b.blockNumber} className="flex flex-wrap justify-between gap-x-3 py-2.5">
                  <Link to={`/trace/${encodeURIComponent(b.batchId)}`} className="font-medium text-forest underline">
                    #{b.blockNumber} · {b.batchId}
                  </Link>
                  <span className="text-muted">
                    {b.crop} · {b.time}
                  </span>
                  <span className="w-full font-mono text-xs text-muted">{shortHash(b.hash)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

type UserFilter = 'all' | 'farmer' | 'buyer' | 'pending';

function UsersTab() {
  const toast = useToast();
  const users = useAsync((signal) => api.listUsers(undefined, signal), []);
  const [filter, setFilter] = useState<UserFilter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  if (users.error && !users.data) return <ErrorState message={users.error} onRetry={users.reload} />;
  if (!users.data) return <Spinner label="Loading users" />;

  const list = users.data.filter((u: User) => {
    if (filter === 'pending') return !u.verified && u.role !== 'admin';
    if (filter === 'all') return true;
    return u.role === filter;
  });

  const toggle = async (u: User) => {
    setBusyId(u.id);
    try {
      await api.verifyUser(u.id, !u.verified);
      toast(u.verified ? `${u.name} unverified` : `${u.name} verified`);
      users.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filters: [UserFilter, string][] = [
    ['all', 'All'],
    ['farmer', 'Farmers'],
    ['buyer', 'Buyers'],
    ['pending', 'Pending verification'],
  ];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {filters.map(([id, label]) => (
          <button key={id} type="button" onClick={() => setFilter(id)} className={`chip ${filter === id ? 'chip-active' : ''}`}>
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState compact title="No users here" text="Nobody matches this filter." />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {list.map((u) => (
            <li key={u.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                  {u.name}
                  <Badge>{u.role}</Badge>
                  {u.verified && <VerifiedBadge />}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {u.phone} · {u.location}
                  {u.farmOrBusinessName ? ` · ${u.farmOrBusinessName}` : ''}
                </p>
                <p className="text-xs text-muted">Joined {formatDate(u.registeredDate)}</p>
              </div>
              {u.role !== 'admin' && (
                <button
                  type="button"
                  disabled={busyId === u.id}
                  onClick={() => void toggle(u)}
                  className={`btn btn-sm ${u.verified ? 'btn-outline' : 'btn-primary'}`}
                >
                  {busyId === u.id ? 'Saving…' : u.verified ? 'Remove verification' : 'Verify'}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ListingsTab() {
  const toast = useToast();
  const produce = useAsync((signal) => api.listProduce({}, signal), []);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (produce.error && !produce.data) return <ErrorState message={produce.error} onRetry={produce.reload} />;
  if (!produce.data) return <Spinner label="Loading listings" />;
  if (produce.data.length === 0) return <EmptyState compact title="No listings" text="Farmers have not posted anything yet." />;

  const setStatus = async (id: string, status: ProduceStatus) => {
    setBusyId(id);
    try {
      await api.updateProduce(id, { status });
      toast('Status updated');
      produce.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string, title: string) => {
    if (!window.confirm(`Remove "${title}" from the marketplace? This cannot be undone.`)) return;
    setBusyId(id);
    try {
      await api.deleteProduce(id);
      toast('Listing removed');
      produce.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ul className="space-y-3">
      {produce.data.map((p) => (
        <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <Link to={`/produce/${p.id}`} className="font-semibold text-ink hover:underline">
              {p.title}
            </Link>
            <p className="text-sm text-muted">
              {p.farmerName} · {p.location} · {p.quantityLabel} · {p.priceDisplay}
            </p>
            <p className="font-mono text-xs text-muted">{p.batchId}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              aria-label={`Status for ${p.title}`}
              className="input !w-auto"
              value={p.status}
              disabled={busyId === p.id}
              onChange={(e) => void setStatus(p.id, e.target.value as ProduceStatus)}
            >
              {PRODUCE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="button" disabled={busyId === p.id} onClick={() => void remove(p.id, p.title)} className="btn btn-danger btn-sm">
              Remove
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RequestsTab() {
  const requests = useAsync((signal) => api.listRequests(signal), []);
  if (requests.error && !requests.data) return <ErrorState message={requests.error} onRetry={requests.reload} />;
  if (!requests.data) return <Spinner label="Loading requests" />;
  if (requests.data.length === 0) return <EmptyState compact title="No requests" text="Buyer requests will appear here." />;
  return (
    <ul className="space-y-3">
      {requests.data.map((r) => (
        <li key={r.id} className="card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-ink">{r.produceTitle}</p>
            <RequestStatusBadge status={r.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {r.buyerName} · {r.buyerPhone} · {r.quantityRequested} {r.unit}
            {r.offerPrice ? ` at ₦${r.offerPrice.toLocaleString()}` : ''} · {formatDateTime(r.createdAt)}
          </p>
          {r.farmerResponseNotes && <p className="mt-2 rounded-md bg-sand p-3 text-sm text-ink">{r.farmerResponseNotes}</p>}
        </li>
      ))}
    </ul>
  );
}

function LedgerTab({ adminName }: { adminName: string }) {
  const toast = useToast();
  const stats = useAsync((signal) => api.adminStats(signal), []);
  const produce = useAsync((signal) => api.listProduce({}, signal), []);
  const [batchId, setBatchId] = useState('');
  const [reason, setReason] = useState('');
  const [correctedBy, setCorrectedBy] = useState(adminName);
  const [errors, setErrors] = useState<{ batch?: string; reason?: string }>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { batch?: string; reason?: string } = {};
    if (!batchId) next.batch = 'Choose a batch';
    if (reason.trim().length < 5) next.reason = 'Give a reason of at least 5 characters';
    setErrors(next);
    setFormError('');
    if (next.batch || next.reason) return;
    setBusy(true);
    try {
      const entry = await api.correctRecord({ batchId, reason: reason.trim(), correctedBy: correctedBy.trim() || undefined });
      toast(`Platform audit correction recorded in block #${entry.correctionBlock}`);
      setReason('');
      stats.reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5" aria-labelledby="blocks-title">
        <h2 id="blocks-title" className="font-display text-xl font-semibold text-ink">Recent platform audit blocks</h2>
        {!stats.data ? (
          stats.error ? <ErrorState message={stats.error} onRetry={stats.reload} /> : <Spinner label="Loading blocks" />
        ) : (
          <ul className="mt-3 divide-y divide-line/70 text-sm">
            {stats.data.recentBlocks.map((b) => (
              <li key={b.blockNumber} className="py-2.5">
                <Link to={`/trace/${encodeURIComponent(b.batchId)}`} className="font-medium text-forest underline">
                  #{b.blockNumber} · {b.batchId}
                </Link>
                <p className="text-muted">
                  {b.crop} · {b.time}
                </p>
                <p className="font-mono text-xs text-muted">{shortHash(b.hash)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form onSubmit={submit} noValidate className="card space-y-4 p-5" aria-labelledby="correct-title">
        <div>
          <h2 id="correct-title" className="font-display text-xl font-semibold text-ink">Record a correction</h2>
          <p className="mt-1 text-sm text-muted">This appends to AgriQora’s PostgreSQL audit ledger. It does not submit a Solana transaction.</p>
        </div>
        <SelectField label="Batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} error={errors.batch}>
          <option value="">Select a batch…</option>
          {(produce.data ?? []).map((p) => (
            <option key={p.id} value={p.batchId}>
              {p.batchId} — {p.title}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
        <TextField label="Corrected by" value={correctedBy} onChange={(e) => setCorrectedBy(e.target.value)} />
        {formError && <InlineMessage kind="error">{formError}</InlineMessage>}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Recording…' : 'Record correction'}
        </button>
      </form>
    </div>
  );
}

function AnnouncementsTab({ adminName }: { adminName: string }) {
  const toast = useToast();
  const posts = useAsync((signal) => api.listCommunity(signal), []);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Announcement');
  const [content, setContent] = useState('');
  const [location, setLocation] = useState('');
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: { title?: string; content?: string } = {};
    if (!title.trim()) next.title = 'Add a title';
    if (!content.trim()) next.content = 'Write the announcement';
    setErrors(next);
    setFormError('');
    if (next.title || next.content) return;
    setBusy(true);
    try {
      await api.createPost({
        title: title.trim(),
        content: content.trim(),
        category,
        author: adminName,
        location: location.trim() || undefined,
      });
      toast('Announcement posted');
      setTitle('');
      setContent('');
      setLocation('');
      posts.reload();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} noValidate className="card space-y-4 p-5">
        <h2 className="font-display text-xl font-semibold text-ink">Post an announcement</h2>
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <SelectField label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {['Announcement', 'Market update', 'Training', 'Event', 'Alert'].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="Message" value={content} onChange={(e) => setContent(e.target.value)} error={errors.content} />
        <TextField label="Location" optional value={location} onChange={(e) => setLocation(e.target.value)} />
        {formError && <InlineMessage kind="error">{formError}</InlineMessage>}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Posting…' : 'Post announcement'}
        </button>
      </form>
      <section aria-labelledby="posted-title">
        <h2 id="posted-title" className="font-display text-xl font-semibold text-ink">Posted</h2>
        {!posts.data ? (
          posts.error ? <ErrorState message={posts.error} onRetry={posts.reload} /> : <Spinner label="Loading announcements" />
        ) : posts.data.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing posted yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {posts.data.map((p) => (
              <li key={p.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-ink">{p.title}</p>
                  <Badge>{p.category}</Badge>
                </div>
                <p className="mt-1 text-sm text-ink/85">{p.content}</p>
                <p className="mt-1 text-xs text-muted">
                  {p.author} · {p.location} · {p.date}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function AdminDashboard() {
  useTitle('Admin');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TAB_IDS.find((t) => t === requested) ?? 'overview';
  if (!user) return null;

  return (
    <div className="wrap pb-14 pt-10">
      <PageHeader title="Admin" subtitle="Verify users, manage listings, keep the ledger honest and post announcements." />
      <div className="mt-6">
        <TabBar<Tab>
          label="Admin sections"
          active={tab}
          onChange={(id) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })}
          tabs={[
            { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" aria-hidden /> },
            { id: 'users', label: 'Users', icon: <Users className="h-4 w-4" aria-hidden /> },
            { id: 'listings', label: 'Listings', icon: <Sprout className="h-4 w-4" aria-hidden /> },
            { id: 'requests', label: 'Requests', icon: <ClipboardList className="h-4 w-4" aria-hidden /> },
            { id: 'ledger', label: 'Ledger', icon: <ScrollText className="h-4 w-4" aria-hidden /> },
            { id: 'announcements', label: 'Announcements', icon: <Megaphone className="h-4 w-4" aria-hidden /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" aria-hidden /> },
          ]}
        />
      </div>
      <div className="mt-6">
        {tab === 'overview' && <Overview />}
        {tab === 'users' && <UsersTab />}
        {tab === 'listings' && <ListingsTab />}
        {tab === 'requests' && <RequestsTab />}
        {tab === 'ledger' && <LedgerTab adminName={user.name} />}
        {tab === 'announcements' && <AnnouncementsTab adminName={user.name} />}
        {tab === 'notifications' && <NotificationsPanel role="Admin" />}
      </div>
      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Admin API operations are protected by server-side role checks.
      </p>
    </div>
  );
}
