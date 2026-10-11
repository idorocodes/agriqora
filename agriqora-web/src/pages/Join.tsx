import { useState, type FormEvent } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../lib/api';
import { dashboardPath, FieldError, useAuth } from '../lib/auth';
import { isValidPhone } from '../lib/phone';
import { useTitle } from '../lib/useTitle';
import {
  focusFirstInvalid,
  InlineMessage,
  TextAreaField,
  TextField,
} from '../components/ui';

type Role = 'farmer' | 'buyer';

type Errors = Partial<
  Record<
    | 'name'
    | 'phone'
    | 'email'
    | 'password'
    | 'location'
    | 'crops'
    | 'produceBought',
    string
  >
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Join() {
  useTitle('Join AgriQora');

  const { user, register } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next');
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null;

  const [role, setRole] = useState<Role>(() => params.get('role') === 'buyer' ? 'buyer' : 'farmer');

  const [v, setV] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    location: '',
    farmName: '',
    crops: '',
    farmSize: '',
    produceBought: '',
    businessDetails: '',
  });

  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return <Navigate to={safeNext ?? dashboardPath(user.role)} replace />;
  }

  const set =
    (k: keyof typeof v) =>
    (e: { target: { value: string } }) => {
      setV((previous) => ({
        ...previous,
        [k]: e.target.value,
      }));

      setErrors((previous) => ({
        ...previous,
        [k]: undefined,
      }));

      setFormError('');
    };

  const farmer = role === 'farmer';

  const normalizePhone = (value: string) => {
    const phone = value.replace(/[\s()-]/g, '');

    if (/^0\d{10}$/.test(phone)) {
      return `+234${phone.slice(1)}`;
    }

    if (/^234\d{10}$/.test(phone)) {
      return `+${phone}`;
    }

    return phone;
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const form = e.currentTarget;
    const next: Errors = {};

    const name = v.name.trim();
    const email = v.email.trim();
    const phone = normalizePhone(v.phone);

    if (name.length < 2) {
      next.name = farmer
        ? 'Enter your full name'
        : 'Enter your name or business name';
    }

    if (!isValidPhone(v.phone)) {
      next.phone = 'Enter a valid phone number, e.g. 0803 234 5678';
    }

    if (v.password.length < 10) {
      next.password = 'Password must be at least 10 characters';
    }

    if (!email) {
      if (!farmer) {
        next.email = 'Enter your email address';
      }
    } else if (!EMAIL_RE.test(email)) {
      next.email = 'Enter a valid email address';
    }

    if (!v.location.trim()) {
      next.location = 'Enter your location';
    }

    if (farmer && !v.crops.trim()) {
      next.crops = 'Tell us what crops you grow';
    }

    if (!farmer && !v.produceBought.trim()) {
      next.produceBought = 'Tell us what produce you buy';
    }

    setErrors(next);
    setFormError('');

    if (Object.keys(next).length > 0) {
      focusFirstInvalid(form);
      return;
    }

    setBusy(true);

    try {
      const common = {
        name,
        phone,
        password: v.password,
        email: email || undefined,
        location: v.location.trim(),
      };

      if (farmer) {
        await register({
          ...common,
          role: 'farmer',
          farmOrBusinessName: v.farmName.trim() || undefined,
          farmSize: v.farmSize.trim() || undefined,
          cropsOrInterests: v.crops.trim(),
        });
      } else {
        await register({
          ...common,
          role: 'buyer',
          farmOrBusinessName: v.businessDetails.trim() || name,
          cropsOrInterests: v.produceBought.trim(),
        });
      }
    } catch (err) {
      if (err instanceof FieldError && err.field === 'phone') {
        setErrors((previous) => ({
          ...previous,
          phone: err.message,
        }));
      } else {
        setFormError(errorMessage(err));
      }

      setBusy(false);
      focusFirstInvalid(form);
    }
  };

  return (
    <div className="wrap py-12 sm:py-16">
      <form
        onSubmit={submit}
        noValidate
        className="card mx-auto max-w-xl space-y-5 p-6 sm:p-8"
      >
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">
            Create your account
          </h1>

          <p className="mt-1 text-sm text-muted">
            {farmer
              ? 'List your produce and reach verified buyers.'
              : 'Find fresh, traceable produce from farmers.'}
          </p>
        </div>

        <div
          className="grid grid-cols-2 gap-1 rounded-lg bg-pill p-1"
          role="group"
          aria-label="Account type"
        >
          {(['farmer', 'buyer'] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => {
                setRole(r);
                setErrors({});
                setFormError('');
              }}
              className={`rounded-md py-2.5 text-sm font-semibold ${
                role === r
                  ? 'bg-forest text-white'
                  : 'text-ink hover:bg-white/60'
              }`}
            >
              {r === 'farmer' ? "I'm a farmer" : "I'm a buyer"}
            </button>
          ))}
        </div>

        <TextField
          label={farmer ? 'Full name' : 'Name or business name'}
          autoComplete="name"
          value={v.name}
          onChange={set('name')}
          error={errors.name}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Phone number"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={v.phone}
            onChange={set('phone')}
            error={errors.phone}
            placeholder="0803 234 5678"
          />

          <TextField
            label="Email"
            type="email"
            optional={farmer}
            autoComplete="email"
            value={v.email}
            onChange={set('email')}
            error={errors.email}
          />
        </div>

        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={v.password}
          onChange={set('password')}
          error={errors.password}
        />

        <p className="-mt-3 text-xs text-muted">
          Use at least 10 characters.
        </p>

        <TextField
          label="Location"
          value={v.location}
          onChange={set('location')}
          error={errors.location}
          placeholder="e.g. Suleja, Niger State"
        />

        {farmer ? (
          <>
            <TextField
              label="Farm name"
              optional
              value={v.farmName}
              onChange={set('farmName')}
            />

            <TextField
              label="Crops you grow"
              value={v.crops}
              onChange={set('crops')}
              error={errors.crops}
              placeholder="e.g. Yam, maize"
            />

            <TextField
              label="Farm size"
              optional
              value={v.farmSize}
              onChange={set('farmSize')}
              placeholder="e.g. 5 hectares"
            />
          </>
        ) : (
          <>
            <TextField
              label="Produce you buy"
              value={v.produceBought}
              onChange={set('produceBought')}
              error={errors.produceBought}
              placeholder="e.g. Yam, soybean"
            />

            <TextAreaField
              label="Business details"
              optional
              value={v.businessDetails}
              onChange={set('businessDetails')}
            />
          </>
        )}

        {formError && (
          <InlineMessage kind="error">{formError}</InlineMessage>
        )}

        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary w-full py-3"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-muted">
          Already registered?{' '}
          <Link to="/signin" className="font-semibold text-forest underline">
            Sign in
          </Link>
        </p>

        <p className="text-center text-xs text-muted">
          Your account requires admin verification before it can be verified
          for marketplace use.
        </p>
      </form>
    </div>
  );
}
