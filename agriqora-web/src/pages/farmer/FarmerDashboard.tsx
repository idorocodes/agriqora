import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Bell, ClipboardList, NotebookPen, Sprout, UserRound } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatDateTime, todayISO } from '../../lib/format';
import { useAsync } from '../../lib/hooks';
import { compressImage } from '../../lib/image';
import { phonesMatch } from '../../lib/phone';
import { CATEGORIES, PRODUCE_STATUSES, type BuyerRequest, type ProduceCategory, type ProduceItem, type ProduceStatus, type RequestStatus, type User } from '../../lib/types';
import { useTitle } from '../../lib/useTitle';
import { anchorProduceBatch, solanaProgramId, type PreparedAnchor } from '../../lib/solanaAnchor';
import { NotificationsPanel } from '../../components/NotificationsPanel';
import { ProduceImage } from '../../components/ProduceImage';
import { useToast } from '../../components/Toast';
import {
  EmptyState,
  ErrorState,
  InlineMessage,
  PageHeader,
  RequestStatusBadge,
  SelectField,
  Spinner,
  StatusPill,
  TabBar,
  TextAreaField,
  TextField,
  VerifiedBadge,
} from '../../components/ui';

type Tab = 'listings' | 'requests' | 'records' | 'profile' | 'notifications';
const TAB_IDS: Tab[] = ['listings', 'requests', 'records', 'profile', 'notifications'];

function FarmerWalletControl() {
  const { publicKey, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  return (
    <button
      type="button"
      className="btn btn-outline"
      disabled={connecting}
      onClick={() => publicKey ? void disconnect() : setVisible(true)}
    >
      {connecting ? 'Connecting wallet…' : publicKey ? `${publicKey.toBase58().slice(0, 5)}…${publicKey.toBase58().slice(-5)} · Disconnect` : 'Connect Solana wallet'}
    </button>
  );
}

function AnchorProduceControl({ item, onAnchored }: { item: ProduceItem; onAnchored: () => void }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const toast = useToast();
  const [prepared, setPrepared] = useState<PreparedAnchor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const programConfigured = Boolean(solanaProgramId());

  const prepare = async () => {
    if (!publicKey) return;
    setBusy(true);
    setError('');
    try {
      const next = await api.prepareProduceAnchor(item.id, publicKey.toBase58());
      setPrepared(next);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!publicKey) return;
    setBusy(true);
    setError('');
    try {
      const transaction = await anchorProduceBatch(connection, sendTransaction, publicKey, prepared!);
      await api.confirmProduceAnchor(item.id, transaction.signature);
      toast('Batch commitment confirmed on Solana devnet');
      setPrepared(null);
      onAnchored();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (item.chainAnchor?.status === 'confirmed') {
    return (
      <div className="mt-4 border-t border-line pt-3 text-sm">
        <p className="font-semibold text-forest">Anchored on Solana devnet</p>
        <p className="mt-1 break-all font-mono text-xs text-muted">{item.chainAnchor.anchorAddress}</p>
        {item.chainAnchor.txSignature && (
          <a
            href={`https://explorer.solana.com/tx/${encodeURIComponent(item.chainAnchor.txSignature)}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block font-semibold text-forest underline"
          >
            View confirmed transaction
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-line pt-3">
      <p className="text-sm font-semibold text-ink">Solana batch commitment</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Devnet transaction. The connected farmer wallet pays the network fee and account rent. Only an opaque batch reference and salted record commitment go on-chain; personal details stay in the database.
      </p>
      {!programConfigured && <p className="mt-2 text-xs text-warn">The deployed program ID is not configured yet.</p>}
      {!publicKey ? (
        <div className="mt-3"><FarmerWalletControl /></div>
      ) : prepared ? (
        <div className="mt-3 space-y-2 rounded-md border border-line bg-cream p-3 text-xs">
          <p><span className="font-semibold">Network:</span> Solana devnet</p>
          <p className="break-all"><span className="font-semibold">Batch reference:</span> {prepared.batchRef}</p>
          <p className="break-all"><span className="font-semibold">Record commitment:</span> {prepared.commitment}</p>
          <p className="break-all"><span className="font-semibold">Fee payer and signer:</span> {publicKey.toBase58()}</p>
          <p className="break-all"><span className="font-semibold">Account initialized:</span> {prepared.anchorAddress}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" className="btn btn-primary btn-sm" disabled={busy || !programConfigured} onClick={() => void submit()}>
              {busy ? 'Waiting for wallet…' : 'Sign and anchor'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => setPrepared(null)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-outline btn-sm mt-3" disabled={busy || !programConfigured} onClick={() => void prepare()}>
          {busy ? 'Preparing commitment…' : 'Prepare on-chain record'}
        </button>
      )}
      {publicKey && <div className="mt-2"><FarmerWalletControl /></div>}
      {error && <InlineMessage kind="error">{error}</InlineMessage>}
    </div>
  );
}

/* ---------- Listing form (create + edit) ---------- */

function ListingForm({ user, item, onDone, onCancel }: { user: User; item?: ProduceItem; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({
    title: item?.title ?? '',
    category: (item?.category ?? 'Yam') as ProduceCategory,
    quantity: item ? String(item.quantity) : '',
    unit: item?.unit ?? 'tubers',
    price: item ? String(item.price) : '',
    priceUnit: item?.priceUnit ?? 'tuber',
    location: item?.location ?? user.location,
    harvestDate: item?.harvestDate?.slice(0, 10) ?? todayISO(),
    description: item?.description ?? '',
    status: (item?.status ?? 'Ready now') as ProduceStatus,
  });
  const [image, setImage] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const pick = async (file?: File) => {
    if (!file) return;
    try {
      setImage(await compressImage(file));
      setErrors((p) => ({ ...p, image: '' }));
    } catch (err) {
      setErrors((p) => ({ ...p, image: errorMessage(err) }));
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (f.title.trim().length < 2) next.title = 'Give the produce a name';
    if (!(Number(f.quantity) > 0)) next.quantity = 'Enter a quantity above 0';
    if (!(Number(f.price) > 0)) next.price = 'Enter a price above 0';
    if (!f.unit.trim()) next.unit = 'Enter a unit';
    setErrors(next);
    setFormError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (item) {
        await api.updateProduce(item.id, {
          title: f.title.trim(),
          category: f.category,
          quantity: Number(f.quantity),
          unit: f.unit.trim(),
          price: Number(f.price),
          priceUnit: f.priceUnit.trim(),
          location: f.location.trim(),
          harvestDate: f.harvestDate,
          description: f.description.trim(),
          status: f.status,
          ...(image ? { image } : {}),
        });
        toast('Listing updated');
      } else {
        await api.createProduce({
          title: f.title.trim(),
          category: f.category,
          quantity: Number(f.quantity),
          unit: f.unit.trim(),
          price: Number(f.price),
          priceUnit: f.priceUnit.trim() || undefined,
          location: f.location.trim() || undefined,
          farmerName: user.name,
          farmerPhone: user.phone,
          farmName: user.farmOrBusinessName || undefined,
          harvestDate: f.harvestDate,
          description: f.description.trim() || undefined,
          image,
        });
        toast('Listing posted');
      }
      onDone();
    } catch (err) {
      setFormError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="card max-w-2xl space-y-4 p-5 sm:p-6">
      <h2 className="font-display text-2xl font-semibold text-ink">{item ? 'Edit listing' : 'New listing'}</h2>
      <TextField label="Produce name" value={f.title} onChange={set('title')} error={errors.title} placeholder="e.g. Fresh white yam" />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Category" value={f.category} onChange={set('category')}>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </SelectField>
        {item && (
          <SelectField label="Status" value={f.status} onChange={set('status')}>
            {PRODUCE_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </SelectField>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Quantity" type="number" inputMode="decimal" min="0" value={f.quantity} onChange={set('quantity')} error={errors.quantity} />
        <TextField label="Unit" value={f.unit} onChange={set('unit')} error={errors.unit} placeholder="tubers, bags, kg" />
        <TextField label="Price (₦)" type="number" inputMode="decimal" min="0" value={f.price} onChange={set('price')} error={errors.price} />
        <TextField label="Price per" value={f.priceUnit} onChange={set('priceUnit')} placeholder="tuber, bag, kg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Location" value={f.location} onChange={set('location')} />
        <TextField label="Harvest date" type="date" value={f.harvestDate} onChange={set('harvestDate')} />
      </div>
      <TextAreaField label="Description" optional value={f.description} onChange={set('description')} />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink">
          Photo <span className="font-normal text-muted">(optional)</span>
        </label>
        <input type="file" accept="image/*" onChange={(e) => void pick(e.target.files?.[0])} className="text-sm" />
        {errors.image && <p className="mt-1 text-xs text-red-700">{errors.image}</p>}
        {image && <img src={image} alt="Selected produce preview" className="mt-2 h-24 w-24 rounded-md object-cover" />}
      </div>
      {formError && <InlineMessage kind="error">{formError}</InlineMessage>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Saving…' : item ? 'Save changes' : 'Post listing'}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ---------- Listings ---------- */

function ListingsTab({ user }: { user: User }) {
  const toast = useToast();
  const produce = useAsync((signal) => api.listProduce({}, signal), []);
  const [editing, setEditing] = useState<ProduceItem | 'new' | null>(null);

  if (produce.error && !produce.data) return <ErrorState message={produce.error} onRetry={produce.reload} />;
  if (!produce.data) return <Spinner label="Loading your listings" />;

  if (editing) {
    return (
      <ListingForm
        user={user}
        item={editing === 'new' ? undefined : editing}
        onCancel={() => setEditing(null)}
        onDone={() => {
          setEditing(null);
          produce.reload();
        }}
      />
    );
  }

  const mine = produce.data.filter((p) => phonesMatch(p.farmerPhone, user.phone));

  const remove = async (p: ProduceItem) => {
    if (!window.confirm(`Remove "${p.title}" from the marketplace?`)) return;
    try {
      await api.deleteProduce(p.id);
      toast('Listing removed');
      produce.reload();
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setEditing('new')} className="btn btn-primary">
          + Add produce
        </button>
        <FarmerWalletControl />
      </div>
      {mine.length === 0 ? (
        <EmptyState compact title="No listings yet" text="Post your first produce so buyers can find it." />
      ) : (
        <ul className="mt-5 space-y-4">
          {mine.map((p) => (
            <li key={p.id} className="card flex gap-4 p-4">
              <ProduceImage src={p.image} alt="" category={p.category} width={96} height={96} className="hidden h-24 w-24 shrink-0 rounded-md sm:block" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Link to={`/produce/${p.id}`} className="font-display text-xl font-semibold text-ink hover:underline">
                    {p.title}
                  </Link>
                  <StatusPill status={p.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {p.quantityLabel} · {p.priceDisplay} · {p.location}
                </p>
                <p className="font-mono text-xs text-muted">{p.batchId}</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={() => setEditing(p)} className="btn btn-outline btn-sm">
                    Edit
                  </button>
                  <Link to={`/trace/${encodeURIComponent(p.batchId)}`} className="btn btn-outline btn-sm">
                    Trace
                  </Link>
                  <button type="button" onClick={() => void remove(p)} className="btn btn-danger btn-sm">
                    Remove
                  </button>
                </div>
                <AnchorProduceControl item={p} onAnchored={produce.reload} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------- Requests ---------- */

const REPLY_STATUSES: RequestStatus[] = ['Available', 'Partially available', 'Not available', 'Completed'];

function RequestCard({ r, onSaved }: { r: BuyerRequest; onSaved: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState<RequestStatus>(r.status === 'Pending' ? 'Available' : r.status);
  const [notes, setNotes] = useState(r.farmerResponseNotes ?? '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api.updateRequestStatus(r.id, { status, farmerResponseNotes: notes.trim() || undefined });
      toast('Reply sent to the buyer');
      onSaved();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-semibold text-ink">{r.produceTitle}</h3>
        <RequestStatusBadge status={r.status} />
      </div>
      <p className="mt-1 text-sm text-ink">
        {r.buyerName} wants {r.quantityRequested} {r.unit}
        {r.offerPrice ? ` at ₦${r.offerPrice.toLocaleString()} each` : ''} · {formatDateTime(r.createdAt)}
      </p>
      <p className="text-sm text-muted">
        <a href={`tel:${r.buyerPhone.replace(/\s/g, '')}`} className="underline">
          {r.buyerPhone}
        </a>
        {r.location ? ` · ${r.location}` : ''}
      </p>
      {r.notes && <p className="mt-2 rounded-md bg-sand p-3 text-sm text-ink">{r.notes}</p>}
      <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr]">
        <SelectField label="Your reply" value={status} onChange={(e) => setStatus(e.target.value as RequestStatus)}>
          {REPLY_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </SelectField>
        <TextField label="Note to buyer" optional value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Ready for pickup Friday" />
      </div>
      <button type="button" disabled={busy} onClick={() => void save()} className="btn btn-primary btn-sm mt-3">
        {busy ? 'Sending…' : r.status === 'Pending' ? 'Send reply' : 'Update reply'}
      </button>
    </li>
  );
}

function RequestsTab({ user }: { user: User }) {
  const requests = useAsync((signal) => api.listRequests(signal), []);
  const produce = useAsync((signal) => api.listProduce({}, signal), []);
  if (requests.error && !requests.data) return <ErrorState message={requests.error} onRetry={requests.reload} />;
  if (!requests.data || !produce.data) return <Spinner label="Loading requests" />;

  const myIds = new Set(produce.data.filter((p) => phonesMatch(p.farmerPhone, user.phone)).map((p) => p.id));
  const mine = requests.data.filter((r) => myIds.has(r.produceId));
  if (mine.length === 0) return <EmptyState compact title="No requests yet" text="Buyer requests for your produce will show up here." />;
  return (
    <ul className="space-y-4">
      {mine.map((r) => (
        <RequestCard key={r.id} r={r} onSaved={requests.reload} />
      ))}
    </ul>
  );
}

/* ---------- Farm records ---------- */

const ACTIVITIES = ['Planting', 'Fertilizing', 'Weeding', 'Spraying', 'Harvesting', 'Storage', 'Other'];

function RecordsTab({ user }: { user: User }) {
  const toast = useToast();
  const records = useAsync((signal) => api.listRecords(user.name, signal), [user.name]);
  const [activityType, setActivityType] = useState('Planting');
  const [crop, setCrop] = useState('');
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!crop.trim()) {
      setErr('Enter the crop');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      await api.createRecord({ farmerName: user.name, activityType, crop: crop.trim(), date, location: user.location, notes: notes.trim() || undefined });
      toast('Record saved');
      setCrop('');
      setNotes('');
      records.reload();
    } catch (e2) {
      setErr(errorMessage(e2));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} noValidate className="card space-y-4 p-5">
        <h2 className="font-display text-xl font-semibold text-ink">Log a farm activity</h2>
        <SelectField label="Activity" value={activityType} onChange={(e) => setActivityType(e.target.value)}>
          {ACTIVITIES.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </SelectField>
        <TextField label="Crop" value={crop} onChange={(e) => setCrop(e.target.value)} />
        <TextField label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <TextAreaField label="Notes" optional value={notes} onChange={(e) => setNotes(e.target.value)} />
        {err && <InlineMessage kind="error">{err}</InlineMessage>}
        <button type="submit" disabled={busy} className="btn btn-primary">
          {busy ? 'Saving…' : 'Save record'}
        </button>
      </form>
      <section>
        <h2 className="font-display text-xl font-semibold text-ink">Your records</h2>
        {!records.data ? (
          records.error ? <ErrorState message={records.error} onRetry={records.reload} /> : <Spinner label="Loading records" />
        ) : records.data.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No records yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {records.data.map((r) => (
              <li key={r.id} className="card p-4 text-sm">
                <p className="font-semibold text-ink">
                  {r.activityType} · {r.crop}
                </p>
                <p className="text-muted">{formatDate(r.date)}</p>
                {r.notes && <p className="mt-1 text-ink/85">{r.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ---------- Profile ---------- */

function ProfileTab({ user }: { user: User }) {
  const rows: [string, string][] = [
    ['Name', user.name],
    ['Phone number', user.phone],
    ['Email', user.email || '—'],
    ['Location', user.location],
    ['Farm', user.farmOrBusinessName || '—'],
    ['Farm size', user.farmSize || '—'],
    ['Crops', user.cropsOrInterests || '—'],
    ['Joined', formatDate(user.registeredDate)],
  ];
  return (
    <section className="card max-w-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-ink">Farmer profile</h2>
        {user.verified ? <VerifiedBadge label="Verified farmer" /> : <span className="rounded-full bg-warn-bg px-3 py-1 text-xs font-semibold text-warn">Waiting for verification</span>}
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

export default function FarmerDashboard() {
  useTitle('Farmer portal');
  const { user, refresh } = useAuth();
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = TAB_IDS.find((t) => t === requested) ?? 'listings';

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!user) return null;

  return (
    <div className="wrap pb-14 pt-10">
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Manage your produce, answer buyers and keep your farm records." />
      <div className="mt-6">
        <TabBar<Tab>
          label="Farmer sections"
          active={tab}
          onChange={(id) => setParams(id === 'listings' ? {} : { tab: id }, { replace: true })}
          tabs={[
            { id: 'listings', label: 'My produce', icon: <Sprout className="h-4 w-4" aria-hidden /> },
            { id: 'requests', label: 'Buyer requests', icon: <ClipboardList className="h-4 w-4" aria-hidden /> },
            { id: 'records', label: 'Farm records', icon: <NotebookPen className="h-4 w-4" aria-hidden /> },
            { id: 'profile', label: 'Profile', icon: <UserRound className="h-4 w-4" aria-hidden /> },
            { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" aria-hidden /> },
          ]}
        />
      </div>
      <div className="mt-6">
        {tab === 'listings' && <ListingsTab user={user} />}
        {tab === 'requests' && <RequestsTab user={user} />}
        {tab === 'records' && <RecordsTab user={user} />}
        {tab === 'profile' && <ProfileTab user={user} />}
        {tab === 'notifications' && <NotificationsPanel role="Farmer" />}
      </div>
    </div>
  );
}
