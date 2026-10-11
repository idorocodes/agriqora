import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDate, shortHash } from '../lib/format';
import { useAsync } from '../lib/hooks';
import type { BuyerRequest, ProduceItem } from '../lib/types';
import { useTitle } from '../lib/useTitle';
import { ProduceImage } from '../components/ProduceImage';
import { useToast } from '../components/Toast';
import {
  ErrorState,
  InlineMessage,
  Spinner,
  StatusPill,
  TextAreaField,
  TextField,
  VerifiedBadge,
  focusFirstInvalid,
} from '../components/ui';

function RequestForm({ item }: { item: ProduceItem }) {
  const { user } = useAuth();
  const toast = useToast();
  const buyer = user?.role === 'buyer' ? user : null;

  const [quantity, setQuantity] = useState('');
  const [offer, setOffer] = useState('');
  const [place, setPlace] = useState(buyer?.location ?? '');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<BuyerRequest | null>(null);
  const nextPath = `/produce/${encodeURIComponent(item.id)}`;

  if (item.status === 'Sold out') {
    return (
      <InlineMessage kind="error">
        This produce is sold out right now.{' '}
        <Link to="/" className="font-semibold underline">
          Browse other produce
        </Link>
      </InlineMessage>
    );
  }

  if (user && user.role !== 'buyer') {
    return (
      <InlineMessage kind="success">
        You are signed in as {user.role === 'farmer' ? 'a farmer' : 'an administrator'}. Buyer requests are sent from a
        buyer account.
      </InlineMessage>
    );
  }

  if (!user) {
    return (
      <InlineMessage kind="error">
        Sign in with a buyer account to send a request.{' '}
        <Link to={`/signin?next=${encodeURIComponent(nextPath)}`} className="font-semibold underline">
          Sign in
        </Link>{' '}
        or{' '}
        <Link to={`/join?role=buyer&next=${encodeURIComponent(nextPath)}`} className="font-semibold underline">
          create a buyer account
        </Link>
        .
      </InlineMessage>
    );
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-forest/25 bg-forest-soft p-5" role="status">
        <p className="flex items-center gap-2 font-display text-xl font-semibold text-forest">
          <CircleCheck className="h-5 w-5" aria-hidden /> Request sent
        </p>
        <p className="mt-2 text-[15px] text-ink">
          You asked for {sent.quantityRequested} {sent.unit} of {sent.produceTitle}. The farmer has been notified and
          will reply with <em>Available</em>, <em>Partially available</em> or <em>Not available</em>.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/buyer?tab=requests" className="btn btn-primary">
            View my requests
          </Link>
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setSent(null);
              setQuantity('');
              setOffer('');
              setNotes('');
            }}
          >
            Send another request
          </button>
        </div>
      </div>
    );
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const next: Record<string, string> = {};
    const qty = Number(quantity);
    const offerNumber = offer.trim() === '' ? undefined : Number(offer);

    if (!quantity.trim() || !Number.isFinite(qty) || qty <= 0) next.quantity = 'Enter how much you need';
    if (offerNumber !== undefined && (!Number.isFinite(offerNumber) || offerNumber <= 0)) {
      next.offer = 'Enter a valid price, or leave this empty';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      focusFirstInvalid(form);
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const created = await api.createRequest({
        produceId: item.id,
        quantityRequested: qty,
        unit: item.unit,
        offerPrice: offerNumber,
        location: place.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSent(created);
      toast('Request sent to the farmer');
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={`How many ${item.unit} do you need?`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          error={errors.quantity}
          hint={`${item.quantityLabel}`}
        />
        <TextField
          label={`Your price per ${item.priceUnit}`}
          optional
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          error={errors.offer}
          hint={`Asking price: ${item.priceDisplay}`}
        />
        <TextField
          label="Delivery or pickup location"
          optional
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="e.g. Suleja market"
        />
        <TextAreaField
          label="Message to the farmer"
          optional
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="When do you need it? Any size or quality needs?"
          className="sm:col-span-2"
        />
      </div>
      {formError && <InlineMessage kind="error">{formError}</InlineMessage>}
      <button type="submit" disabled={submitting} className="btn btn-primary w-full py-3">
        {submitting ? 'Sending…' : 'Send request'}
      </button>
      <p className="text-xs text-muted">No payment is taken here. The farmer will reply and you can agree details directly.</p>
    </form>
  );
}

export default function ProduceDetail() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { data: item, error, reload } = useAsync((signal) => api.getProduce(id, signal), [id]);
  useTitle(item?.title);

  if (error && !item) {
    return (
      <div className="wrap py-10">
        <ErrorState message={error} onRetry={reload} />
        <p className="text-center">
          <Link to="/" className="font-semibold text-forest underline">
            Back to the marketplace
          </Link>
        </p>
      </div>
    );
  }
  if (!item) {
    return (
      <div className="wrap">
        <Spinner label="Loading produce" />
      </div>
    );
  }

  const details: [string, string][] = [
    ['Category', item.category],
    ['Location', item.location],
    ['Harvested', formatDate(item.harvestDate)],
    ['Available from', item.availabilityDate ? formatDate(item.availabilityDate) : 'Now'],
  ];

  return (
    <div className="wrap pb-14 pt-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-forest hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to marketplace
      </Link>

      <div className="mt-5 grid gap-x-10 gap-y-6 lg:grid-cols-2">
        <ProduceImage
          src={item.image}
          alt={item.title}
          category={item.category}
          priority
          width={800}
          height={600}
          className="aspect-[4/3] w-full rounded-lg border border-line lg:col-start-1 lg:row-start-1"
        />

        <div className="space-y-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <header>
            <div className="flex items-center gap-3">
              <StatusPill status={item.status} />
              {item.verified && <VerifiedBadge />}
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">{item.title}</h1>
            <p className="mt-3 text-3xl font-bold text-ink">{item.priceDisplay}</p>
            <p className="mt-1 text-[15px] text-muted">{item.status === 'Sold out' ? 'Sold out' : item.quantityLabel}</p>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-5 text-sm">
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-muted">{label}</dt>
                  <dd className="mt-0.5 font-medium text-ink">{value}</dd>
                </div>
              ))}
              <div className="col-span-2">
                <dt className="text-muted">Farming method</dt>
                <dd className="mt-0.5 font-medium text-ink">{item.farmingMethod}</dd>
              </div>
            </dl>
            <p className="mt-5 text-[15px] leading-relaxed text-ink/90">{item.description}</p>
          </header>

          <section id="request" aria-labelledby="request-title" className="card p-5 sm:p-6">
            <h2 id="request-title" className="font-display text-2xl font-semibold text-ink">
              Request this produce
            </h2>
            <p className="mb-5 mt-1 text-sm text-muted">Tell the farmer how much you need. They will reply in the app.</p>
            <RequestForm key={`${item.id}-${user?.id ?? 'guest'}`} item={item} />
          </section>
        </div>

        <div className="space-y-6 lg:col-start-1 lg:row-start-2">
          <section className="card p-5" aria-labelledby="farmer-title">
            <h2 id="farmer-title" className="font-display text-xl font-semibold text-ink">
              About the farmer
            </h2>
            <div className="mt-4 flex items-start gap-4">
              <div
                aria-hidden
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-forest font-display text-xl font-semibold text-white"
              >
                {item.farmerName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 text-sm">
                <p className="text-base font-semibold text-ink">{item.farmerName}</p>
                <p className="text-muted">
                  {item.farmName}
                  {item.farmSize ? ` · ${item.farmSize}` : ''}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-muted">
                  <MapPin className="h-3.5 w-3.5" aria-hidden /> {item.location}
                </p>
                {user ? (
                  <a href={`tel:${item.farmerPhone.replace(/\s/g, '')}`} className="mt-2 inline-flex items-center gap-1.5 font-semibold text-forest hover:underline">
                    <Phone className="h-4 w-4" aria-hidden /> {item.farmerPhone}
                  </a>
                ) : (
                  <p className="mt-2 text-muted">
                    <Link to="/signin" className="font-semibold text-forest underline">
                      Sign in
                    </Link>{' '}
                    to see the farmer&apos;s phone number.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="card p-5" aria-labelledby="trace-title">
            <h2 id="trace-title" className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
              <ShieldCheck className="h-5 w-5 text-forest" aria-hidden /> Where this came from
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Batch ID</dt>
                <dd className="font-mono font-medium text-ink">{item.batchId}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Ledger block</dt>
                <dd className="font-mono text-ink">#{item.blockNumber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Record hash</dt>
                <dd className="font-mono text-ink">{shortHash(item.blockHash)}</dd>
              </div>
            </dl>
            <Link to={`/trace/${encodeURIComponent(item.batchId)}`} className="btn btn-outline mt-4 w-full">
              View the full journey
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
