import { Link } from 'react-router-dom';
import { useTitle } from '../lib/useTitle';

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <div className="wrap py-24 text-center">
      <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">{text}</p>
      <Link to="/" className="btn btn-primary mt-6">
        Back to the marketplace
      </Link>
    </div>
  );
}

/** Shown for pages that are not built yet (registration, farmer dashboard). */
export function ComingSoon() {
  useTitle('Coming soon');
  return (
    <Notice
      title="Coming in the next update"
      text="Registration and the farmer dashboard are not part of this build yet. Sign in works for existing buyers and admins."
    />
  );
}

export function NotFound() {
  useTitle('Page not found');
  return <Notice title="Page not found" text="We could not find the page you were looking for." />;
}
