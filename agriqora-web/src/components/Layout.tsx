import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Bell, Leaf, LogOut, Menu, X } from 'lucide-react';
import { api } from '../lib/api';
import { dashboardPath, useAuth } from '../lib/auth';

import { countNewNotifications, onNotificationsSeen } from '../lib/notifications';
import type { NotificationRole, User } from '../lib/types';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${light ? '' : 'bg-forest'}`}>
        <Leaf className="h-5 w-5 text-white" strokeWidth={1.75} aria-hidden />
      </span>
      <span className={`font-display text-[25px] font-semibold leading-none tracking-tight ${light ? 'text-white' : 'text-forest'}`}>
        AgriQora
      </span>
    </span>
  );
}

const NAV_LINKS = [
  { to: '/', label: 'Marketplace' },
  { to: '/learn', label: 'Learn' },
  { to: '/trace', label: 'Trace produce' },
];

function notificationRole(user: User | null): NotificationRole | null {
  if (!user) return null;
  return user.role === 'farmer' ? 'Farmer' : user.role === 'buyer' ? 'Buyer' : 'Admin';
}

/** Number of notifications the signed-in user has not opened yet. */
function useNewNotificationCount(user: User | null): number {
  const role = notificationRole(user);
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    if (!role) {
      setCount(0);
      return;
    }
    api
      .listNotifications(role)
      .then((list) => setCount(countNewNotifications(list, role, user?.id)))
      .catch(() => {});
  }, [role, user?.id]);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);
    const stop = onNotificationsSeen(load);
    return () => {
      window.clearInterval(timer);
      stop();
    };
  }, [load]);

  return count;
}

function Navbar() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const newCount = useNewNotificationCount(user);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' || pathname.startsWith('/produce') : pathname.startsWith(to);

  const linkClass = (to: string) =>
    `text-[15px] font-medium transition-colors ${isActive(to) ? 'text-forest' : 'text-muted hover:text-forest'}`;

  const dash = user ? dashboardPath(user.role) : '/signin';

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur">
      <div className="wrap-nav flex h-[72px] items-center justify-between gap-4">
        <Link to="/" aria-label="AgriQora home" className="rounded-md">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={() => linkClass(l.to)}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link
                to={`${dash}?tab=notifications`}
                aria-label={newCount ? `Notifications, ${newCount} new` : 'Notifications'}
                className="relative rounded-full p-2 text-ink hover:bg-sand"
              >
                <Bell className="h-5 w-5" aria-hidden />
                {newCount > 0 && (
                  <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-forest px-1 text-[10px] font-bold text-white">
                    {newCount > 9 ? '9+' : newCount}
                  </span>
                )}
              </Link>
              <Link to={dash} className="btn btn-primary">
                Dashboard
              </Link>
              <button type="button" onClick={signOut} className="btn btn-ghost" aria-label="Sign out">
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="text-[15px] font-medium text-ink hover:text-forest">
                Sign in
              </Link>
              <Link to="/join" className="btn btn-primary px-5">
                Join AgriQora
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-ink hover:bg-sand md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-cream md:hidden">
          <nav aria-label="Mobile" className="wrap flex flex-col py-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-md px-3 py-3 text-base ${
                  isActive(l.to) ? 'bg-sand font-semibold text-forest' : 'font-medium text-ink hover:bg-sand'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
              {user ? (
                <>
                  <Link to={dash} className="btn btn-primary w-full py-3">
                    Dashboard
                  </Link>
                  <Link to={`${dash}?tab=notifications`} className="btn btn-outline w-full py-3">
                    <Bell className="h-4 w-4" aria-hidden />
                    Notifications{newCount > 0 ? ` (${newCount})` : ''}
                  </Link>
                  <button type="button" onClick={signOut} className="btn btn-ghost w-full py-3">
                    <LogOut className="h-4 w-4" aria-hidden />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/join" className="btn btn-primary w-full py-3">
                    Join AgriQora
                  </Link>
                  <Link to="/signin" className="btn btn-outline w-full py-3">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="wrap grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-[380px] text-sm leading-relaxed text-footer-text">
            Better markets, trusted produce, and practical knowledge for farming communities.
          </p>
        </div>
        <div>
          <h2 className="text-base font-medium">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm text-footer-text">
            <li>
              <Link to="/" className="hover:text-white">
                Buy produce
              </Link>
            </li>
            <li>
              <Link to="/learn" className="hover:text-white">
                Farming lessons
              </Link>
            </li>
            <li>
              <Link to="/trace" className="hover:text-white">
                Verify a batch
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-medium">Location</h2>
          <p className="mt-3 text-sm leading-relaxed text-footer-text">
            Suleja and nearby farming communities, Niger State.
          </p>
        </div>
      </div>
    </footer>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-forest focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
