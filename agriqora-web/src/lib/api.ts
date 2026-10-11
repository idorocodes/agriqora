import { API_URL } from './config';
import type {
  AdminStats,
  AppNotification,
  BuyerRequest,
  CommunityPost,
  CorrectionEntry,
  EducationModule,
  FarmRecord,
  NotificationRole,
  ProduceCategory,
  ProduceItem,
  ProduceStatus,
  RequestStatus,
  TraceRecord,
  User,
  UserRole,
} from './types';
import type { PreparedAnchor } from './solanaAnchor';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

interface ApiSessionTokens {
  accessToken: string;
  refreshToken: string;
}

const API_SESSION_KEY = 'agriqora.tokens';

function readApiSessionTokens(): ApiSessionTokens | null {
  try {
    const raw = window.localStorage.getItem(API_SESSION_KEY);
    if (!raw) return null;
    const tokens = JSON.parse(raw) as Partial<ApiSessionTokens>;
    return typeof tokens.accessToken === 'string' && typeof tokens.refreshToken === 'string'
      ? { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
      : null;
  } catch {
    return null;
  }
}

let apiSessionTokens = readApiSessionTokens();
let refreshPromise: Promise<AuthSession> | null = null;

export function setApiSessionTokens(tokens: ApiSessionTokens | null): void {
  apiSessionTokens = tokens;
  try {
    if (tokens) window.localStorage.setItem(API_SESSION_KEY, JSON.stringify(tokens));
    else window.localStorage.removeItem(API_SESSION_KEY);
  } catch {
    /* token persistence is best-effort when storage is unavailable */
  }
}

export function getApiSessionTokens(): ApiSessionTokens | null {
  return apiSessionTokens;
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

type Query = Record<string, string | undefined>;

function qs(query?: Query): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, value);
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

// Every backend response is { success, data?, error?, ... }
interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  [extra: string]: unknown;
}

async function call<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; signal?: AbortSignal } = {},
  retried = false,
): Promise<Envelope<T>> {
  const hasBody = opts.body !== undefined;
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (
    apiSessionTokens?.accessToken &&
    (path === '/api/auth/me' || !path.startsWith('/api/auth/'))
  ) {
    headers.Authorization = `Bearer ${apiSessionTokens.accessToken}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      signal: opts.signal,
      headers: Object.keys(headers).length ? headers : undefined,
      body: hasBody ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new ApiError('Cannot reach the server right now. Please check your connection and try again.');
  }

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    json = null;
  }
  if (!json) {
    throw new ApiError(`The server sent an unexpected response (${res.status}). Please try again.`, res.status);
  }
  const canRefresh = ![
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/auth/logout',
  ].includes(path);
  if (res.status === 401 && !retried && canRefresh && apiSessionTokens?.refreshToken) {
    let pendingRefresh = refreshPromise;
    if (!pendingRefresh) {
      pendingRefresh = call<AuthSession>(
        '/api/auth/refresh',
        { method: 'POST', body: { refreshToken: apiSessionTokens.refreshToken } },
        true,
      ).then((refreshed) => {
        if (!refreshed.data) throw new ApiError('The server could not refresh your session.', 401);
        const session = refreshed.data;
        setApiSessionTokens({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });
        return session;
      });
      refreshPromise = pendingRefresh;
    }
    try {
      await pendingRefresh;
      return call<T>(path, opts, true);
    } catch (err) {
      setApiSessionTokens(null);
      if (typeof window !== 'undefined') window.dispatchEvent(new Event('agriqora:auth-expired'));
      throw err;
    } finally {
      if (refreshPromise === pendingRefresh) refreshPromise = null;
    }
  }
  if (!res.ok || json.success === false) {
    throw new ApiError(json.error ?? `Request failed (${res.status})`, res.status);
  }
  return json;
}

const enc = encodeURIComponent;

export interface ProduceFilters {
  category?: string;
  search?: string;
  location?: string;
  sort?: 'price-asc' | 'price-desc' | 'quantity-desc' | '';
}

export interface CreateProduceInput {
  title: string;
  category: ProduceCategory;
  quantity: number;
  unit: string;
  price: number;
  priceUnit?: string;
  location?: string;
  farmerName: string;
  farmerPhone?: string;
  farmName?: string;
  harvestDate?: string;
  farmingMethod?: string;
  description?: string;
  image?: string;
}

export type UpdateProduceInput = Partial<
  Pick<
    ProduceItem,
    | 'title'
    | 'category'
    | 'quantity'
    | 'price'
    | 'unit'
    | 'priceUnit'
    | 'location'
    | 'image'
    | 'farmerPhone'
    | 'farmSize'
    | 'harvestDate'
    | 'availabilityDate'
    | 'farmingMethod'
    | 'description'
    | 'status'
  >
>;

export interface CreateRequestInput {
  produceId: string;
  quantityRequested: number;
  unit?: string;
  offerPrice?: number;
  location?: string;
  notes?: string;
}

export interface CreateUserInput {
  name: string;
  role: Exclude<UserRole, 'admin'>;
  phone: string;
  email?: string;
  location?: string;
  farmOrBusinessName?: string;
  farmSize?: string;
  password : string,
  cropsOrInterests?: string;
}


export interface CreateRecordInput {
  farmerName: string;
  activityType: string;
  crop: string;
  date?: string;
  location?: string;
  notes?: string;
  batchId?: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  category?: string;
  author?: string;
  location?: string;
}

export const api = {
  health: (signal?: AbortSignal) => call('/api/health', { signal }),

  // Produce
  async listProduce(filters: ProduceFilters = {}, signal?: AbortSignal): Promise<ProduceItem[]> {
    const json = await call<ProduceItem[]>(
      `/api/produce${qs({
        category: filters.category && filters.category !== 'All' ? filters.category : undefined,
        search: filters.search?.trim(),
        location: filters.location?.trim(),
        sort: filters.sort || undefined,
      })}`,
      { signal },
    );
    return json.data ?? [];
  },
  async getProduce(id: string, signal?: AbortSignal): Promise<ProduceItem> {
    const json = await call<ProduceItem>(`/api/produce/${enc(id)}`, { signal });
    return json.data as ProduceItem;
  },
  async createProduce(input: CreateProduceInput): Promise<ProduceItem> {
    const json = await call<ProduceItem>('/api/produce', { method: 'POST', body: input });
    return json.data as ProduceItem;
  },
  async updateProduce(id: string, patch: UpdateProduceInput): Promise<ProduceItem> {
    const json = await call<ProduceItem>(`/api/produce/${enc(id)}`, { method: 'PUT', body: patch });
    return json.data as ProduceItem;
  },
  async deleteProduce(id: string): Promise<void> {
    await call(`/api/produce/${enc(id)}`, { method: 'DELETE' });
  },
  async prepareProduceAnchor(id: string, walletAddress: string): Promise<PreparedAnchor> {
    const json = await call<PreparedAnchor>(`/api/produce/${enc(id)}/anchor/prepare`, {
      method: 'POST',
      body: { walletAddress },
    });
    return json.data as PreparedAnchor;
  },
  async confirmProduceAnchor(id: string, signature: string): Promise<NonNullable<ProduceItem['chainAnchor']>> {
    const json = await call<NonNullable<ProduceItem['chainAnchor']>>(
      `/api/produce/${enc(id)}/anchor/confirm`,
      { method: 'POST', body: { signature } },
    );
    return json.data as NonNullable<ProduceItem['chainAnchor']>;
  },

  // Traceability
  async trace(batchId: string, signal?: AbortSignal): Promise<{ trace: TraceRecord; produce: ProduceItem }> {
    const json = await call<TraceRecord>(`/api/traceability/${enc(batchId)}`, { signal });
    return { trace: json.data as TraceRecord, produce: json.produce as ProduceItem };
  },
  async correctRecord(input: {
    batchId: string;
    reason: string;
    correctedBy?: string;
    updatedFields?: Record<string, unknown>;
  }): Promise<CorrectionEntry> {
    const json = await call<CorrectionEntry>('/api/traceability/correct', { method: 'POST', body: input });
    return json.data as CorrectionEntry;
  },

  // Buyer requests
  async listRequests(signal?: AbortSignal): Promise<BuyerRequest[]> {
    return (await call<BuyerRequest[]>('/api/requests', { signal })).data ?? [];
  },
  async createRequest(input: CreateRequestInput): Promise<BuyerRequest> {
    const json = await call<BuyerRequest>('/api/requests', { method: 'POST', body: input });
    return json.data as BuyerRequest;
  },
  async updateRequestStatus(
    id: string,
    body: { status: RequestStatus; farmerResponseNotes?: string },
  ): Promise<BuyerRequest> {
    const json = await call<BuyerRequest>(`/api/requests/${enc(id)}/status`, { method: 'PATCH', body });
    return json.data as BuyerRequest;
  },

  // Users
  async listUsers(role?: UserRole, signal?: AbortSignal): Promise<User[]> {
    return (await call<User[]>(`/api/users${qs({ role })}`, { signal })).data ?? [];
  },
  async createUser(input: CreateUserInput): Promise<AuthSession> {
    const json = await call<AuthSession>('/api/auth/register', { method: 'POST', body: input });
    return json.data as AuthSession;
  },
  async login(phone: string, password: string): Promise<AuthSession> {
    const json = await call<AuthSession>('/api/auth/login', {
      method: 'POST',
      body: { phone, password },
    });
    return json.data as AuthSession;
  },
  async currentUser(): Promise<User> {
    const json = await call<User>('/api/auth/me');
    return json.data as User;
  },
  async logout(refreshToken: string): Promise<void> {
    await call('/api/auth/logout', { method: 'POST', body: { refreshToken } });
  },
  async verifyUser(id: string, verified: boolean): Promise<User> {
    const json = await call<User>(`/api/users/${enc(id)}/verify`, { method: 'PATCH', body: { verified } });
    return json.data as User;
  },

  // Farm records
  async listRecords(farmerName?: string, signal?: AbortSignal): Promise<FarmRecord[]> {
    return (await call<FarmRecord[]>(`/api/records${qs({ farmerName })}`, { signal })).data ?? [];
  },
  async createRecord(input: CreateRecordInput): Promise<FarmRecord> {
    const json = await call<FarmRecord>('/api/records', { method: 'POST', body: input });
    return json.data as FarmRecord;
  },

  // Community, learning, notifications, admin
  async listCommunity(signal?: AbortSignal): Promise<CommunityPost[]> {
    return (await call<CommunityPost[]>('/api/community', { signal })).data ?? [];
  },
  async createPost(input: CreatePostInput): Promise<CommunityPost> {
    const json = await call<CommunityPost>('/api/community', { method: 'POST', body: input });
    return json.data as CommunityPost;
  },
  async listLearn(crop?: string, signal?: AbortSignal): Promise<EducationModule[]> {
    return (await call<EducationModule[]>(`/api/learn${qs({ crop })}`, { signal })).data ?? [];
  },
  async listNotifications(role: NotificationRole, signal?: AbortSignal): Promise<AppNotification[]> {
    return (await call<AppNotification[]>(`/api/notifications${qs({ role })}`, { signal })).data ?? [];
  },
  async adminStats(signal?: AbortSignal): Promise<AdminStats> {
    return (await call<AdminStats>('/api/admin/stats', { signal })).data as AdminStats;
  },
};

export type { ProduceStatus };
