import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  createRealAuthClient,
  type RealAuthClient,
  type SessionDto,
} from './real-auth-client';
import { AUTH_STORAGE_KEY, type TabLockManager } from './tab-authorization';
import type { HttpTransport } from './contract.provisional';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  copy() {
    const copy = new MemoryStorage();
    this.values.forEach((v, k) => copy.setItem(k, v));
    return copy;
  }
}
class Locks implements TabLockManager {
  held = new Set<string>();
  async request(
    name: string,
    options: { mode: 'exclusive'; ifAvailable: true },
    callback: (lock: unknown | null) => Promise<void>,
  ) {
    expect(options).toEqual({ mode: 'exclusive', ifAvailable: true });
    if (this.held.has(name)) return callback(null);
    this.held.add(name);
    try {
      await callback({ name });
    } finally {
      this.held.delete(name);
    }
  }
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const failure = (code: string, status: number) =>
  json({ error: { code, message: 'test' } }, status);
function session(id = 'a'.repeat(24)): SessionDto {
  return {
    id,
    label: 'Test Operator',
    createdAt: new Date().toISOString(),
    lastPresenceAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
  };
}
const clients: RealAuthClient[] = [];
function client(
  transport: HttpTransport,
  extra: Partial<Parameters<typeof createRealAuthClient>[0]> = {},
) {
  const instance = createRealAuthClient({
    transport,
    origin: 'http://localhost',
    storage: new MemoryStorage(),
    locks: new Locks(),
    navigationType: () => 'navigate',
    randomSecret: () => 'B'.repeat(43),
    events: new EventTarget() as unknown as Window,
    ...extra,
  });
  clients.push(instance);
  return instance;
}
const credentials = { username: 'test', password: 'test-only' };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
});
afterEach(() => {
  clients.splice(0).forEach((c) => c.dispose());
  vi.useRealTimers();
});

test('real login handles INVALID_CREDENTIALS without expiration and stable snapshots', async () => {
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(failure('INVALID_CREDENTIALS', 401))
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    );
  const c = client(transport);
  await c.ready;
  const initial = c.getSnapshot();
  expect(c.getSnapshot()).toBe(initial);
  expect(await c.login(credentials)).toBe('incorrect');
  expect(c.getSnapshot()).toEqual({ status: 'anonymous' });
  expect(await c.login(credentials)).toBe('accepted');
  expect(c.getSnapshot().status).toBe('authenticated');
  const init = transport.mock.calls[1]?.[1];
  expect(init?.credentials).toBe('omit');
  expect(JSON.parse(String(init?.body))).toEqual({
    ...credentials,
    tabBinding: 'B'.repeat(43),
  });
});

test('only structured AUTH_RATE_LIMITED 429 returns rate-limited, distinct from connection failure', async () => {
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(failure('AUTH_RATE_LIMITED', 429))
    .mockResolvedValueOnce(failure('INTERNAL_ERROR', 500))
    .mockResolvedValueOnce(failure('AUTH_RATE_LIMITED', 400))
    .mockRejectedValueOnce(new TypeError('offline'));
  const c = client(transport);
  await c.ready;
  expect(await c.login(credentials)).toBe('rate-limited');
  expect(c.getSnapshot()).toEqual({ status: 'anonymous' });
  expect(await c.login(credentials)).toBe('connection');
  expect(await c.login(credentials)).toBe('connection');
  expect(await c.login(credentials)).toBe('connection');
});

test('hanging refresh aborts and settles at original deadline; ignored abort cannot adopt a late GET', async () => {
  const pending = deferred<Response>();
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockImplementationOnce(() => pending.promise);
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  await vi.advanceTimersByTimeAsync(10_000);
  const refresh = c.refresh();
  expect(c.refresh()).toBe(refresh);
  expect(c.getSnapshot().status).toBe('checking');
  expect(await c.request('/api/example')).toEqual({ kind: 'unauthorized' });
  const signal = transport.mock.calls[1]?.[1]?.signal;
  expect(signal?.aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(109_999);
  expect(c.getSnapshot().status).toBe('checking');
  await vi.advanceTimersByTimeAsync(1);
  await refresh;
  expect(signal?.aborted).toBe(true);
  expect(c.getSnapshot()).toEqual({ status: 'anonymous', reason: 'expired' });
  pending.resolve(json(session()));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(c.getSnapshot()).toEqual({ status: 'anonymous', reason: 'expired' });
  expect(transport).toHaveBeenCalledTimes(2);
});

test('failed refresh keeps the original deadline active in connection-error state', async () => {
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockRejectedValueOnce(new TypeError('offline'));
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  await vi.advanceTimersByTimeAsync(10_000);
  await c.refresh();
  expect(c.getSnapshot().status).toBe('connection-error');
  await vi.advanceTimersByTimeAsync(109_999);
  expect(c.getSnapshot().status).toBe('connection-error');
  await vi.advanceTimersByTimeAsync(1);
  expect(c.getSnapshot()).toEqual({ status: 'anonymous', reason: 'expired' });
});

test('new login cancels hanging refresh, and stale GET cannot replace the new session', async () => {
  const pending = deferred<Response>();
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValueOnce(
      json(
        {
          session: { ...session('b'.repeat(24)), label: 'New login' },
          sessionToken: 'U'.repeat(43),
        },
        201,
      ),
    );
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  const refresh = c.refresh();
  expect(await c.login(credentials)).toBe('accepted');
  await refresh;
  expect(transport.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
  pending.resolve(json(session()));
  for (let i = 0; i < 8; i++) await Promise.resolve();
  expect(c.getSnapshot()).toEqual({
    status: 'authenticated',
    label: 'New login',
  });
});

test('bootstrap hanging GET cannot keep ready/checking pending after the stored deadline', async () => {
  const storage = new MemoryStorage();
  const locks = new Locks();
  const initial = client(
    async () => json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    { storage, locks },
  );
  await initial.ready;
  await initial.login(credentials);
  initial.dispose();
  for (let i = 0; i < 4; i++) await Promise.resolve();
  const pending = deferred<Response>();
  const transport = vi.fn<HttpTransport>(() => pending.promise);
  const reload = client(transport, {
    storage,
    locks,
    navigationType: () => 'reload',
  });
  for (let i = 0; i < 4; i++) await Promise.resolve();
  expect(reload.getSnapshot().status).toBe('checking');
  await vi.advanceTimersByTimeAsync(120_000);
  await reload.ready;
  expect(reload.getSnapshot()).toEqual({
    status: 'anonymous',
    reason: 'expired',
  });
  expect(transport.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  expect(storage.getItem(AUTH_STORAGE_KEY)).toBeNull();
});

test('heartbeat every 30 seconds without operator activity; refresh GET does not extend local deadline', async () => {
  const transport = vi.fn<HttpTransport>(async (input, init) => {
    if (String(input) === '/api/sessions')
      return json({ session: session(), sessionToken: 'T'.repeat(43) }, 201);
    if (init?.method === 'POST')
      return json({
        lastPresenceAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 120_000).toISOString(),
      });
    return json(session());
  });
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  await vi.advanceTimersByTimeAsync(90_000);
  expect(
    transport.mock.calls.filter(([url]) => String(url).endsWith('/presences')),
  ).toHaveLength(3);
  expect(c.getSnapshot().status).toBe('authenticated');
  await c.refresh();
  expect(c.getSnapshot().status).toBe('authenticated');
});

test('lost presence expires locally at 120000 and cannot post a late revival after sleep', async () => {
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockRejectedValue(new TypeError('offline'));
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  await vi.advanceTimersByTimeAsync(119_999);
  expect(c.getSnapshot().status).toBe('authenticated');
  await vi.advanceTimersByTimeAsync(1);
  expect(c.getSnapshot()).toEqual({ status: 'anonymous', reason: 'expired' });
  const calls = transport.mock.calls.length;
  await c.refresh();
  expect(transport).toHaveBeenCalledTimes(calls);
  await c.login(credentials);
  expect(c.getSnapshot().status).toBe('anonymous');
});

test('pending presence cannot revive after the local deadline, even when its response arrives late', async () => {
  const pending = deferred<Response>();
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockImplementationOnce(() => pending.promise);
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  await vi.advanceTimersByTimeAsync(120_000);
  expect(c.getSnapshot()).toEqual({ status: 'anonymous', reason: 'expired' });
  pending.resolve(
    json({
      lastPresenceAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 120_000).toISOString(),
    }),
  );
  await Promise.resolve();
  await Promise.resolve();
  expect(c.getSnapshot()).toEqual({ status: 'anonymous', reason: 'expired' });
});

test('old 401 cannot expire a newer login; suppress old response and merge Headers securely', async () => {
  const pending = deferred<Response>();
  let logins = 0;
  const transport = vi.fn<HttpTransport>(async (input) => {
    if (String(input) === '/api/sessions') {
      logins++;
      return json(
        {
          session: session(logins.toString(16).repeat(24)),
          sessionToken: (logins === 1 ? 'A' : 'C').repeat(43),
        },
        201,
      );
    }
    return pending.promise;
  });
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  const result = c.request('/api/example', {
    headers: new Headers({ Accept: 'application/json' }),
  });
  await c.login(credentials);
  pending.resolve(failure('UNAUTHORIZED', 401));
  expect(await result).toMatchObject({
    kind: 'error',
    code: 'REQUEST_SUPERSEDED',
  });
  expect(c.getSnapshot().status).toBe('authenticated');
  const sent = transport.mock.calls[1]?.[1];
  expect(new Headers(sent?.headers).get('Accept')).toBe('application/json');
  expect(new Headers(sent?.headers).get('Authorization')).toBe(
    `Bearer ${'A'.repeat(43)}`,
  );
  const count = transport.mock.calls.length;
  expect(await c.request('https://external.invalid/api/example')).toMatchObject(
    { kind: 'error', status: 0 },
  );
  expect(transport).toHaveBeenCalledTimes(count);
});

test('logout suspends operations; network uncertainty retains token only for retry and 204 confirms closure', async () => {
  const pending = deferred<Response>();
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  const closing = c.logout();
  expect(c.getSnapshot().status).toBe('closing');
  expect(await c.request('/api/example')).toEqual({ kind: 'unauthorized' });
  pending.resolve(failure('INTERNAL_ERROR', 500));
  await closing;
  expect(c.getSnapshot()).toEqual({
    status: 'close-error',
    label: 'Test Operator',
    uncertain: true,
  });
  const count = transport.mock.calls.length;
  await vi.advanceTimersByTimeAsync(60_000);
  expect(transport).toHaveBeenCalledTimes(count);
  await c.logout();
  expect(c.getSnapshot()).toEqual({ status: 'anonymous', reason: 'closed' });
  expect(
    new Headers(transport.mock.calls[2]?.[1]?.headers).get('Authorization'),
  ).toBe(`Bearer ${'T'.repeat(43)}`);
});

test('logout known rejection is not uncertain; 401 expires without claiming prior 204', async () => {
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockResolvedValueOnce(failure('VALIDATION_ERROR', 400))
    .mockResolvedValueOnce(failure('UNAUTHORIZED', 401));
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  await c.logout();
  expect(c.getSnapshot()).toMatchObject({
    status: 'close-error',
    uncertain: false,
  });
  await c.logout();
  expect(c.getSnapshot()).toEqual({ status: 'anonymous', reason: 'expired' });
});

test('logout does not claim confirmed closure on an unexpected 200 response', async () => {
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockResolvedValueOnce(json({}));
  const c = client(transport);
  await c.ready;
  await c.login(credentials);
  await c.logout();
  expect(c.getSnapshot()).toEqual({
    status: 'close-error',
    label: 'Test Operator',
    uncertain: true,
  });
});

test('an unexpected 200 login payload is not accepted as session issuance', async () => {
  const c = client(async () =>
    json({ session: session(), sessionToken: 'T'.repeat(43) }),
  );
  await c.ready;
  expect(await c.login(credentials)).toBe('connection');
  expect(c.getSnapshot()).toEqual({ status: 'anonymous' });
});

test('reload validates before display; navigate/back_forward discard copy without revoking original', async () => {
  const storage = new MemoryStorage();
  const locks = new Locks();
  const transport = vi.fn<HttpTransport>(async (url) =>
    String(url) === '/api/sessions'
      ? json({ session: session(), sessionToken: 'T'.repeat(43) }, 201)
      : json(session()),
  );
  const original = client(transport, { storage, locks });
  await original.ready;
  await original.login(credentials);
  for (const navigationType of ['navigate', 'back_forward']) {
    const copy = storage.copy();
    const calls = transport.mock.calls.length;
    const duplicate = client(transport, {
      storage: copy,
      locks,
      navigationType: () => navigationType,
    });
    await duplicate.ready;
    expect(duplicate.getSnapshot().status).toBe('anonymous');
    expect(copy.getItem(AUTH_STORAGE_KEY)).toBeNull();
    expect(transport).toHaveBeenCalledTimes(calls);
  }
  original.dispose();
  for (let i = 0; i < 4; i++) await Promise.resolve();
  const pending = deferred<Response>();
  const reload = client(() => pending.promise, {
    storage,
    locks,
    navigationType: () => 'reload',
  });
  expect(reload.getSnapshot().status).toBe('checking');
  await Promise.resolve();
  pending.resolve(json(session()));
  await reload.ready;
  expect(reload.getSnapshot().status).toBe('authenticated');
});

test('copied reload cannot queue behind owner; independently authenticated tab can own another session', async () => {
  const storage = new MemoryStorage();
  const locks = new Locks();
  let count = 0;
  const transport = vi.fn<HttpTransport>(async () => {
    count++;
    return json(
      {
        session: session(count.toString(16).repeat(24)),
        sessionToken: (count === 1 ? 'T' : 'U').repeat(43),
      },
      201,
    );
  });
  const original = client(transport, { storage, locks });
  await original.ready;
  await original.login(credentials);
  const copy = storage.copy();
  const duplicate = client(transport, {
    storage: copy,
    locks,
    navigationType: () => 'reload',
  });
  await duplicate.ready;
  expect(duplicate.getSnapshot().status).toBe('anonymous');
  expect(copy.getItem(AUTH_STORAGE_KEY)).toBeNull();
  expect(original.getSnapshot().status).toBe('authenticated');
  expect(transport).toHaveBeenCalledTimes(1);
  expect(await duplicate.login(credentials)).toBe('accepted');
  expect(locks.held.size).toBe(2);
});

test('expired reload is rejected before protected display; dispose never revokes', async () => {
  const storage = new MemoryStorage();
  const locks = new Locks();
  const transport = vi
    .fn<HttpTransport>()
    .mockResolvedValueOnce(
      json({ session: session(), sessionToken: 'T'.repeat(43) }, 201),
    )
    .mockResolvedValueOnce(failure('UNAUTHORIZED', 401));
  const original = client(transport, { storage, locks });
  await original.ready;
  await original.login(credentials);
  original.dispose();
  for (let i = 0; i < 4; i++) await Promise.resolve();
  const reload = client(transport, {
    storage,
    locks,
    navigationType: () => 'reload',
  });
  await reload.ready;
  expect(reload.getSnapshot()).toEqual({
    status: 'anonymous',
    reason: 'expired',
  });
  expect(
    transport.mock.calls.some(([, init]) => init?.method === 'DELETE'),
  ).toBe(false);
});

test('missing capabilities and connection failure fail closed, never fixtures', async () => {
  const blocked = new MemoryStorage();
  blocked.setItem = () => {
    throw new Error('blocked');
  };
  const transport = vi
    .fn<HttpTransport>()
    .mockRejectedValue(new TypeError('offline'));
  const c = client(transport, { storage: blocked });
  await c.ready;
  expect(c.getSnapshot().status).toBe('connection-error');
  expect(await c.login(credentials)).toBe('connection');
  expect(transport).not.toHaveBeenCalled();
  const online = client(transport);
  await online.ready;
  expect(await online.login(credentials)).toBe('connection');
  expect(online.getSnapshot().status).not.toBe('authenticated');
});

test('superseded login best-effort revokes orphan only, not newest session', async () => {
  const pending = deferred<Response>();
  const transport = vi
    .fn<HttpTransport>()
    .mockImplementationOnce(() => pending.promise)
    .mockResolvedValueOnce(
      json(
        { session: session('b'.repeat(24)), sessionToken: 'B'.repeat(43) },
        201,
      ),
    )
    .mockResolvedValue(new Response(null, { status: 204 }));
  const c = client(transport);
  await c.ready;
  const first = c.login(credentials);
  expect(await c.login(credentials)).toBe('accepted');
  pending.resolve(
    json(
      { session: session('a'.repeat(24)), sessionToken: 'A'.repeat(43) },
      201,
    ),
  );
  expect(await first).toBe('superseded');
  expect(c.getSnapshot().status).toBe('authenticated');
  expect(
    new Headers(transport.mock.calls[2]?.[1]?.headers).get('Authorization'),
  ).toBe(`Bearer ${'A'.repeat(43)}`);
});
