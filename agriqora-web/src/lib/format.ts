import type { ProduceCategory } from './types';

export function formatDate(value?: string): string {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

export function formatDateTime(value?: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function shortHash(hash: string): string {
  return hash.length > 20 ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : hash;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

const TINTS: Record<string, string> = {
  Vegetables: '#dbe8c9',
  Fruits: '#f3e2c1',
  Other: '#e8e6cc',
};

/** A small inline SVG used when a listing has no usable photo. */
export function placeholderImage(category?: ProduceCategory | string): string {
  const label = category ?? 'Produce';
  const tint = TINTS[label] ?? '#e8e6cc';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">` +
    `<rect width="400" height="300" fill="${tint}"/>` +
    `<g fill="none" stroke="#0d4a19" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".55" transform="translate(168 96)">` +
    `<path d="M60 4C20 8-8 24-8 62c0 20 11 30 28 30 34 0 42-40 40-88z"/><path d="M4 100c10-26 26-46 48-60"/></g>` +
    `<text x="200" y="250" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="#0d4a19" opacity=".7">${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// The backend seeds listings with "/src/assets/images/<file>.jpg".
// This app serves those same files from /images/<file>.jpg.
const SEED_IMAGE_PREFIX = '/src/assets/images/';

export function imageSrc(path: string | undefined, category?: ProduceCategory | string): string {
  if (!path) return placeholderImage(category);
  if (path.startsWith('data:') || /^https?:\/\//i.test(path)) return path;
  if (path.startsWith(SEED_IMAGE_PREFIX)) return `/images/${path.slice(SEED_IMAGE_PREFIX.length)}`;
  return path;
}
