import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, ScrollText, Search, ShieldCheck } from 'lucide-react';
import { api } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/format';
import { useAsync } from '../lib/hooks';
import { useTitle } from '../lib/useTitle';
import { useToast } from '../components/Toast';
import { ErrorState, InlineMessage, PageHeader, Spinner } from '../components/ui';

function CopyButton({ value }: { value: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm shrink-0"
      aria-label="Copy record hash"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          toast('Could not copy. Select the text and copy it instead.', 'error');
        }
      }}
    >
      {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export default function Trace() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(batchId ?? '');
  useTitle('Trace produce');

  useEffect(() => setInput(batchId ?? ''), [batchId]);

  const recent = useAsync((signal) => api.listProduce({}, signal), []);
  const result = useAsync(
    (signal) => (batchId ? api.trace(batchId, signal) : Promise.resolve(null)),
    [batchId],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = input.trim();
    if (id) navigate(`/trace/${encodeURIComponent(id)}`);
  };

  const trace = result.data?.trace;

  return (
    <div className="wrap pb-14 pt-10">
      <PageHeader
        title="Trace produce"
        subtitle="Enter a batch ID to see where produce came from and how it moved from the farm to the buyer."
      />

      <form onSubmit={submit} role="search" className="mt-6 flex max-w-2xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. AGQ-YAM-2026-881"
            aria-label="Batch ID"
            autoCapitalize="characters"
            className="input h-12 pl-12 font-mono"
          />
        </div>
        <button type="submit" className="btn btn-primary h-12 px-6">
          Trace
        </button>
      </form>

      {recent.data && recent.data.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted">Recent batches:</span>
          {recent.data.slice(0, 6).map((p) => (
            <Link
              key={p.id}
              to={`/trace/${encodeURIComponent(p.batchId)}`}
              className="rounded-md border border-line bg-card px-2.5 py-1 font-mono text-xs text-forest hover:bg-sand"
            >
              {p.batchId}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8" aria-live="polite">
        {!batchId ? null : result.loading && !result.data ? (
          <Spinner label="Looking up the record" />
        ) : result.error ? (
          result.error.toLowerCase().includes('not found') ? (
            <div className="max-w-2xl">
              <InlineMessage kind="error">
                {result.error} Check the batch ID and try again.
              </InlineMessage>
            </div>
          ) : (
            <ErrorState message={result.error} onRetry={result.reload} />
          )
        ) : trace && result.data ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <section className="card h-fit p-5 sm:p-6" aria-labelledby="record-title">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Produce</p>
                  <h2 id="record-title" className="font-display text-2xl font-semibold text-ink">
                    {trace.produceTitle}
                  </h2>
                </div>
                {trace.tamperVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-soft px-3 py-1 text-xs font-semibold text-forest">
                    <ShieldCheck className="h-4 w-4" aria-hidden /> Verified on Solana devnet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-bg px-3 py-1 text-xs font-semibold text-warn">
                    Not anchored on Solana
                  </span>
                )}
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                {(
                  [
                    ['Batch ID', trace.batchId, true],
                    ['Farmer', trace.farmerName, false],
                    ['Farm location', trace.farmLocation, false],
                    ['Harvest date', formatDate(trace.harvestDate), false],
                    ['Recorded on', formatDateTime(trace.timestamp), false],
                    ['Platform record sequence', `#${trace.blockNumber}`, true],
                  ] as [string, string, boolean][]
                ).map(([label, value, mono]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-line/70 pb-3 last:border-0">
                    <dt className="text-muted">{label}</dt>
                    <dd className={`text-right font-medium text-ink ${mono ? 'font-mono' : ''}`}>{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-4">
                <p className="text-sm text-muted">Platform audit hash (off-chain)</p>
                <div className="mt-1 flex items-start gap-2 rounded-md bg-sand p-3">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs text-ink">{trace.blockHash}</code>
                  <CopyButton value={trace.blockHash} />
                </div>
                <p className="mt-2 text-xs text-muted">This application-side hash is not itself a Solana transaction or proof.</p>
              </div>

              <section className="mt-4 rounded-md border border-line bg-cream p-3 text-sm" aria-label="Solana verification details">
                <p className="font-semibold text-ink">Solana verification</p>
                <p className="mt-1 text-xs text-muted">
                  {trace.blockchain?.verified
                    ? 'The current platform record matches the commitment in its program-owned account on devnet.'
                    : trace.blockchain?.status === 'confirmed'
                      ? 'The anchored snapshot no longer matches the current platform record.'
                      : 'No confirmed Solana commitment is available for this batch.'}
                </p>
                {trace.blockchain?.commitment && <p className="mt-2 break-all font-mono text-[11px]">Commitment: {trace.blockchain.commitment}</p>}
                {trace.blockchain?.anchorAddress && <p className="mt-1 break-all font-mono text-[11px]">Account: {trace.blockchain.anchorAddress}</p>}
                {trace.blockchain?.txSignature && (
                  <a href={`https://explorer.solana.com/tx/${encodeURIComponent(trace.blockchain.txSignature)}?cluster=devnet`} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-forest underline">
                    View transaction on Solana Explorer
                  </a>
                )}
              </section>

              <Link to={`/produce/${result.data.produce.id}`} className="btn btn-outline mt-5 w-full">
                View this listing
              </Link>
            </section>

            <div className="space-y-6">
              <section className="card p-5 sm:p-6" aria-labelledby="journey-title">
                <h2 id="journey-title" className="font-display text-2xl font-semibold text-ink">
                  Journey from farm to buyer
                </h2>
                <ol className="mt-5">
                  {trace.steps.map((step, i) => (
                    <li key={step.stage} className="relative pb-6 pl-9 last:pb-0">
                      {i < trace.steps.length - 1 && (
                        <span className="absolute left-[11px] top-6 h-full w-px bg-line" aria-hidden />
                      )}
                      <span
                        className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-forest text-xs font-bold text-white"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <h3 className="text-[15px] font-semibold text-ink">{step.stage}</h3>
                      <p className="mt-0.5 text-xs text-muted">
                        {step.actor} · {step.location} · {/^\d{4}-/.test(step.date) ? formatDate(step.date) : step.date}
                      </p>
                      <p className="mt-1.5 text-sm text-ink/90">{step.details}</p>
                      {step.verifiedOnLedger && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-forest">
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Recorded on the ledger
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>

              <section className="card p-5 sm:p-6" aria-labelledby="corrections-title">
                <h2 id="corrections-title" className="flex items-center gap-2 font-display text-xl font-semibold text-ink">
                  <ScrollText className="h-5 w-5 text-forest" aria-hidden /> Corrections
                </h2>
                {trace.corrections.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">No corrections have been recorded for this batch.</p>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-muted">
                      Mistakes are corrected by adding a new entry. The original record is never deleted.
                    </p>
                    <ul className="mt-4 space-y-3">
                      {trace.corrections.map((c) => (
                        <li key={c.correctionHash} className="rounded-md border border-line bg-cream p-3 text-sm">
                          <p className="font-medium text-ink">{c.reason}</p>
                          <p className="mt-1 text-xs text-muted">
                            By {c.correctedBy} · {formatDateTime(c.timestamp)} · block #{c.correctionBlock}
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] text-muted">{c.correctionHash}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
