import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api, getApiSessionTokens, setApiSessionTokens } from './api';
import { normalizePhone } from './phone';
import type { User } from './types';

/**
 * AUTH NOTE
 * Credentials and refresh tokens are issued by the API. This module owns the
 * browser-side user session and keeps it synchronized with the server.
 */

const SESSION_KEY = 'agriqora.session';

function readSession(): User | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeSession(user: User | null): void {
  try {
    if (user) window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable (private mode): the session lasts until reload */
  }
}

export interface FarmerSignup {
  role: 'farmer';
  name: string;
  phone: string;
  email?: string;
  location: string;
  password: string;
  farmOrBusinessName?: string;
  cropsOrInterests: string;
  farmSize?: string;
}

export interface BuyerSignup {
  role: 'buyer';
  name: string;
  phone: string;
  email?: string;
  password: string;
  location: string;
  farmOrBusinessName?: string;
  cropsOrInterests: string;
}

export type Signup = FarmerSignup | BuyerSignup;

/** An error that belongs to one form field. */
export class FieldError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = 'FieldError';
    this.field = field;
  }
}

interface AuthContextValue {
  user: User | null;
  /** False until the saved session has been checked against the server. */
  ready: boolean;
  notice: string | null;
  clearNotice: () => void;
  signIn: (phone: string, password: string, opts?: { admin?: boolean }) => Promise<User>;
  register: (input: Signup) => Promise<User>;
  signOut: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getApiSessionTokens() ? readSession() : null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Revalidate persisted sessions with the server before enabling protected routes.
  useEffect(() => {
    let cancelled = false;
    const saved = readSession();
    const tokens = getApiSessionTokens();
    const clearExpiredSession = () => {
      writeSession(null);
      setUser(null);
      setNotice('Your session has expired. Please sign in again.');
    };
    window.addEventListener('agriqora:auth-expired', clearExpiredSession);

    if (!saved || !tokens) {
      if (saved) {
        writeSession(null);
        setUser(null);
        setNotice('Please sign in again to continue.');
      }
      if (!tokens) setApiSessionTokens(null);
      setReady(true);
      return () => window.removeEventListener('agriqora:auth-expired', clearExpiredSession);
    }
    api
      .currentUser()
      .then((fresh) => {
        if (cancelled) return;
        setUser(fresh);
        writeSession(fresh);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          setApiSessionTokens(null);
          clearExpiredSession();
        } else {
          setUser(saved);
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
      window.removeEventListener('agriqora:auth-expired', clearExpiredSession);
    };
  }, []);

  const signIn = useCallback(async (phone: string, password: string, opts?: { admin?: boolean }) => {
    const session = await api.login(normalizePhone(phone), password);
    const found = session.user;
    if ((opts?.admin && found.role !== 'admin') || (!opts?.admin && found.role === 'admin')) {
      void api.logout(session.refreshToken).catch(() => undefined);
      throw new Error(opts?.admin ? 'No administrator account matches those credentials.' : 'Use the administrator sign-in page for this account.');
    }
    setApiSessionTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
    writeSession(found);
    setUser(found);
    setNotice(null);
    return found;
  }, []);

  const register = useCallback(async (input: Signup) => {
    const phone = normalizePhone(input.phone);
    try {
      const session = await api.createUser(
        input.role === 'farmer'
          ? {
            name: input.name,
            role: 'farmer',
            phone,
            email: input.email,
            password : input.password,
            location: input.location,
            farmOrBusinessName: input.farmOrBusinessName,
            farmSize: input.farmSize,
            cropsOrInterests: input.cropsOrInterests,
            }
          : {
            name: input.name, 
            role: 'buyer',
            phone,
            email: input.email,
            password: input.password,
            location: input.location, 
            farmOrBusinessName: input.farmOrBusinessName,
            cropsOrInterests: input.cropsOrInterests,
            },
      );
      setApiSessionTokens({ accessToken: session.accessToken, refreshToken: session.refreshToken });
      const created = session.user;
      writeSession(created);
      setUser(created);
      setNotice(null);
      return created;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        throw new FieldError('phone', 'An account with this phone number already exists. Please sign in instead.');
      }
      throw err;
    }
  }, []);

  const signOut = useCallback(() => {
    const tokens = getApiSessionTokens();
    setApiSessionTokens(null);
    if (tokens) void api.logout(tokens.refreshToken).catch(() => undefined);
    writeSession(null);
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    if (!readSession()) return;
    try {
      const fresh = await api.currentUser();
      writeSession(fresh);
      setUser(fresh);
    } catch {
      /* keep what we have */
    }
  }, []);

  const clearNotice = useCallback(() => setNotice(null), []);

  const value = useMemo(
    () => ({ user, ready, notice, clearNotice, signIn, register, signOut, refresh }),
    [user, ready, notice, clearNotice, signIn, register, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export function dashboardPath(role: User['role']): string {
  return role === 'farmer' ? '/farmer' : role === 'buyer' ? '/buyer' : '/admin';
}
