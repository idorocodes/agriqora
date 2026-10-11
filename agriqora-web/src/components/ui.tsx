import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import type { ProduceStatus, RequestStatus } from '../lib/types';

/* ---------- Loading, error and empty states ---------- */

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted">
      <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card mx-auto my-10 max-w-md p-6 text-center">
      <CircleAlert className="mx-auto h-8 w-8 text-danger" aria-hidden />
      <p className="mt-3 text-[15px] text-ink">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-primary mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  children,
  compact = false,
}: {
  title: string;
  text?: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`text-center ${compact ? 'py-10' : 'py-28'}`}>
      <h3 className="font-display text-2xl font-semibold text-ink">{title}</h3>
      {text && <p className="mt-1 text-[15px] text-ink/80">{text}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export function InlineMessage({ kind, children }: { kind: 'error' | 'success'; children: ReactNode }) {
  const styles =
    kind === 'error'
      ? 'border-danger/30 bg-danger-bg text-danger'
      : 'border-forest/25 bg-forest-soft text-forest';
  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm ${styles}`}
    >
      {kind === 'error' ? (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      )}
      <div>{children}</div>
    </div>
  );
}

/* ---------- Badges ---------- */

const produceStatusStyle: Record<ProduceStatus, string> = {
  'Ready now': 'bg-pill text-ink',
  'Harvesting soon': 'bg-warn-bg text-warn',
  'Sold out': 'bg-danger-bg text-danger',
};

export function StatusPill({ status }: { status: ProduceStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${produceStatusStyle[status]}`}>
      {status}
    </span>
  );
}

const requestStatusStyle: Record<RequestStatus, string> = {
  Pending: 'bg-warn-bg text-warn',
  Available: 'bg-forest-soft text-forest',
  'Partially available': 'bg-warn-bg text-warn',
  'Not available': 'bg-danger-bg text-danger',
  Completed: 'bg-pill text-ink',
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${requestStatusStyle[status]}`}>
      {status}
    </span>
  );
}

export function VerifiedBadge({ label = 'Verified' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest">
      <CircleCheck className="h-4 w-4" aria-hidden />
      {label}
    </span>
  );
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'warn' }) {
  const tones = {
    neutral: 'bg-pill text-ink',
    green: 'bg-forest-soft text-forest',
    warn: 'bg-warn-bg text-warn',
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

/* ---------- Form fields ---------- */

interface FieldBase {
  label: string;
  optional?: boolean;
  error?: string;
  hint?: string;
  className?: string;
}

function FieldShell({
  id,
  label,
  optional,
  error,
  hint,
  className,
  children,
}: FieldBase & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-note`} className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-note`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField({
  label,
  optional,
  error,
  hint,
  className,
  ...props
}: FieldBase & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`input ${error ? 'input-error' : ''}`}
      />
    </FieldShell>
  );
}

export function TextAreaField({
  label,
  optional,
  error,
  hint,
  className,
  ...props
}: FieldBase & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      <textarea
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`input min-h-[88px] ${error ? 'input-error' : ''}`}
      />
    </FieldShell>
  );
}

export function SelectField({
  label,
  optional,
  error,
  hint,
  className,
  children,
  ...props
}: FieldBase & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} optional={optional} error={error} hint={hint} className={className}>
      <select
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`input ${error ? 'input-error' : ''}`}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/** After a failed submit, move focus to the first field that has an error. */
export function focusFirstInvalid(form: HTMLFormElement | null): void {
  window.requestAnimationFrame(() => {
    form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });
}

/* ---------- Layout helpers ---------- */

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition-colors ${
            active === tab.id ? 'border-forest text-forest' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          {tab.icon}
          {tab.label}
          {tab.badge ? (
            <span className="rounded-full bg-forest px-1.5 py-0.5 text-[11px] leading-none text-white">{tab.badge}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
