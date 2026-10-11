import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, setApiSessionTokens } from '../src/lib/api';

afterEach(() => {
  setApiSessionTokens(null);
  vi.unstubAllGlobals();
});

describe('registration API', () => {
  it('returns the user nested in the auth session response', async () => {
    const user = {
      id: 'usr-new-buyer',
      name: 'New Buyer',
      role: 'buyer',
      phone: '+2348032345678',
      email: 'buyer@example.com',
      location: 'Suleja',
      farmOrBusinessName: 'Fresh Foods',
      cropsOrInterests: 'Yam',
      verified: false,
      registeredDate: '2026-10-11',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            data: { accessToken: 'access-token', refreshToken: 'refresh-token', user },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );

    const created = await api.createUser({
      name: 'New Buyer',
      role: 'buyer',
      phone: '+2348032345678',
      email: 'buyer@example.com',
      location: 'Suleja',
      farmOrBusinessName: 'Fresh Foods',
      password: 'a-long-password',
      cropsOrInterests: 'Yam',
    });

    expect(created.user).toEqual(user);
    expect(created.user.role).toBe('buyer');
    expect(created.accessToken).toBe('access-token');
    expect(created.refreshToken).toBe('refresh-token');
  });

  it('sends the access token with protected API requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    setApiSessionTokens({ accessToken: 'valid-access', refreshToken: 'valid-refresh' });

    await api.listUsers();

    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer valid-access',
    });
  });

  it('refreshes an expired access token and retries the request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false, error: 'expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        success: true,
        data: { accessToken: 'new-access', refreshToken: 'new-refresh', user: {} },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));
    vi.stubGlobal('fetch', fetchMock);
    setApiSessionTokens({ accessToken: 'expired-access', refreshToken: 'old-refresh' });

    await api.listUsers();

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh');
    expect(fetchMock.mock.calls[2][1].headers).toMatchObject({
      Authorization: 'Bearer new-access',
    });
  });
});