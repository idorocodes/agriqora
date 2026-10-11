import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { dashboardPath, useAuth } from '../lib/auth';
import type { UserRole } from '../lib/types';
import { Spinner } from './ui';

/** Only lets signed-in users with the right role see a page. */
export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="wrap">
        <Spinner label="Checking your account" />
      </div>
    );
  }
  if (!user) {
    const to = role === 'admin' ? '/admin/login' : `/signin?next=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={to} replace />;
  }
  if (user.role !== role) {
    return (
      <div className="wrap py-24 text-center">
        <h1 className="font-display text-3xl font-semibold text-ink">This page is for {role} accounts</h1>
        <p className="mx-auto mt-2 max-w-md text-[15px] text-muted">You are signed in as {user.role === 'admin' ? 'an administrator' : `a ${user.role}`}.</p>
        <Link to={dashboardPath(user.role)} className="btn btn-primary mt-6">
          Go to my dashboard
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
