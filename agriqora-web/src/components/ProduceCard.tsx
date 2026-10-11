import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { ProduceItem } from '../lib/types';
import { ProduceImage } from './ProduceImage';
import { StatusPill, VerifiedBadge } from './ui';

export function ProduceCard({ item, priority }: { item: ProduceItem; priority?: boolean }) {
  return (
    <article className="card flex flex-col overflow-hidden">
      <Link to={`/produce/${item.id}`} tabIndex={-1} aria-hidden="true" className="block">
        <ProduceImage
          src={item.image}
          alt=""
          category={item.category}
          priority={priority}
          className="aspect-[4/3] w-full"
        />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <StatusPill status={item.status} />
          {item.verified && <VerifiedBadge />}
        </div>
        <h3 className="mt-3 font-display text-[20px] font-semibold leading-tight text-ink">{item.title}</h3>
        <p className="mt-1 text-sm text-muted">{item.status === 'Sold out' ? 'Sold out' : item.quantityLabel}</p>
        <p className="mt-3 text-lg font-bold text-ink">{item.priceDisplay}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{item.location}</span>
        </p>
        <div className="mt-auto pt-4">
          <Link to={`/produce/${item.id}`} className="btn btn-primary w-full py-2">
            View produce
            <span className="sr-only"> — {item.title}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

export function ProduceCardSkeleton() {
  return (
    <div className="card animate-pulse overflow-hidden" aria-hidden>
      <div className="aspect-[4/3] bg-sand" />
      <div className="space-y-3 p-4">
        <div className="h-6 w-24 rounded-full bg-sand" />
        <div className="h-6 w-3/4 rounded bg-sand" />
        <div className="h-4 w-1/2 rounded bg-sand" />
        <div className="h-5 w-2/5 rounded bg-sand" />
        <div className="h-9 rounded-md bg-sand" />
      </div>
    </div>
  );
}
