import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, ListFilter, Search } from 'lucide-react';
import { api, type ProduceFilters } from '../lib/api';
import { plural } from '../lib/format';
import { useAsync, useDebounced } from '../lib/hooks';
import { useTitle } from '../lib/useTitle';
import { MARKET_CATEGORIES } from '../lib/types';
import { ProduceCard, ProduceCardSkeleton } from '../components/ProduceCard';
import { EmptyState, ErrorState } from '../components/ui';

const SORTS: { value: NonNullable<ProduceFilters['sort']>; label: string }[] = [
  { value: '', label: 'Recently added' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'quantity-desc', label: 'Most available' },
];

export default function Marketplace() {
  useTitle();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') ?? 'All';
  const sortParam = params.get('sort') ?? '';
  const sort = SORTS.some((s) => s.value === sortParam) ? (sortParam as NonNullable<ProduceFilters['sort']>) : '';

  const [searchText, setSearchText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const search = useDebounced(searchText);
  const location = useDebounced(locationText);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value && value !== 'All') next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const { data, error, loading, reload } = useAsync(
    (signal) => api.listProduce({ category, search, location, sort }, signal),
    [category, search, location, sort],
  );

  const hasFilters = category !== 'All' || searchText.trim() !== '' || locationText.trim() !== '';
  const resetFilters = () => {
    setSearchText('');
    setLocationText('');
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <>
      <section className="border-b border-line bg-sand">
        <div className="wrap py-10 sm:py-14">
      
          <h1 className="font-display text-[34px] font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl sm:leading-none">
            Find what you need, closer to home.
          </h1>

          <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-6 flex max-w-3xl gap-2 sm:mt-8">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search yam, maize, location..."
                aria-label="Search produce"
                className="input h-12 pl-12"
              />
            </div>
            <button
              type="button"
              aria-label="Filters"
              aria-expanded={showFilters}
              aria-controls="filter-panel"
              onClick={() => setShowFilters((v) => !v)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-forest text-white transition-colors hover:bg-forest-dark"
            >
              <ListFilter className="h-5 w-5" aria-hidden />
            </button>
          </form>

          {showFilters && (
            <div id="filter-panel" className="mt-3 grid max-w-3xl gap-4 rounded-md border border-line bg-card p-4 sm:grid-cols-2">
              <div>
                <label htmlFor="filter-location" className="mb-1.5 block text-sm font-medium">
                  Location
                </label>
                <input
                  id="filter-location"
                  value={locationText}
                  onChange={(e) => setLocationText(e.target.value)}
                  placeholder="e.g. Suleja, Gurara"
                  className="input"
                />
              </div>
              <div>
                <label htmlFor="filter-sort" className="mb-1.5 block text-sm font-medium">
                  Sort by
                </label>
                <select id="filter-sort" value={sort} onChange={(e) => setParam('sort', e.target.value)} className="input">
                  {SORTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="wrap pb-10 pt-10">
        <div role="group" aria-label="Categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {['All', ...MARKET_CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setParam('category', c)}
              className={`chip shrink-0 ${category === c ? 'chip-active' : ''}`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between gap-4">
          <p aria-live="polite" className="text-base font-medium text-ink">
            {data ? `${plural(data.length, 'listing', 'listings')} available` : 'Loading listings…'}
          </p>
          <label className="relative flex items-center text-[15px] text-muted">
            <span className="sr-only">Sort listings</span>
            <select
              value={sort}
              onChange={(e) => setParam('sort', e.target.value)}
              className="cursor-pointer appearance-none bg-transparent py-1 pr-5 text-right text-[15px] text-muted hover:text-ink"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4" aria-hidden />
          </label>
        </div>

        <div className="mt-4" aria-busy={loading}>
          {error && !data ? (
            <ErrorState message={error} onRetry={reload} />
          ) : !data ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <ProduceCardSkeleton key={i} />
              ))}
            </div>
          ) : data.length === 0 ? (
            <EmptyState title="No produce found" text="Try another name or category.">
              {hasFilters && (
                <button type="button" onClick={resetFilters} className="btn btn-outline">
                  Clear filters
                </button>
              )}
            </EmptyState>
          ) : (
            <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${loading ? 'opacity-60' : ''}`}>
              {data.map((item, i) => (
                <ProduceCard key={item.id} item={item} priority={i < 4} />
              ))}
            </div>
          )}
          {error && data && (
            <p role="alert" className="mt-4 text-center text-sm text-danger">
              {error}{' '}
              <button type="button" onClick={reload} className="font-semibold underline">
                Retry
              </button>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
