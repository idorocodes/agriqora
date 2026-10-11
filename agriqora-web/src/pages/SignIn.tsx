import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { dashboardPath, useAuth } from '../lib/auth';
import { isValidPhone } from '../lib/phone';
import { useTitle } from '../lib/useTitle';
import { InlineMessage, TextField } from '../components/ui';


/** Phone-number sign in. `admin` switches to the administrator version of the page. */
export default function SignIn({ admin = false }: { admin?: boolean }) {
  useTitle(admin ? 'Admin sign in' : 'Sign in');
  const { user, signIn, notice } = useAuth();
  const [params] = useSearchParams();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [busy, setBusy] = useState(false);

  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

  if (user && (!admin || user.role === 'admin')) {
    return <Navigate to={safeNext ?? dashboardPath(user.role)} replace />;
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setPasswordError('');
    if (!isValidPhone(phone)) {
      setFieldError('Enter a valid phone number, e.g. 0803 234 5678');
      return;
    }
    setFieldError('');
    if (!password) {
      setPasswordError('Enter your password');
      return;
    }
    setBusy(true);
    try {
      await signIn(phone, password, { admin });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="wrap py-12 sm:py-16">
      <form onSubmit={submit} noValidate className="card mx-auto max-w-md space-y-5 p-6 sm:p-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">{admin ? 'Admin sign in' : 'Sign in'}</h1>
          <p className="mt-1 text-sm text-muted">
            {admin ? 'For platform administrators only.' : 'Use the phone number you registered with.'}
          </p>
        </div>
        {notice && <InlineMessage kind="error">{notice}</InlineMessage>}
        <TextField
          label="Phone number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={fieldError}
          placeholder="0803 234 5678"
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={passwordError}
        />
        {error && <InlineMessage kind="error">{error}</InlineMessage>}
        <button type="submit" disabled={busy} className="btn btn-primary w-full py-3">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {!admin && (
          <p className="text-center text-sm text-muted">
           
            <Link to="/" className="font-semibold text-forest underline">
              Browse produce
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
