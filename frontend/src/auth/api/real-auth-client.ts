import type {
  AuthClient,
  HttpResult,
  HttpTransport,
  LoginInput,
  LoginResult,
  SessionState,
} from './contract.provisional';
import {
  createAuthorizedHttpClient,
  createAuthorizedResponseClient,
  createHttpClient,
  type AuthorizationSnapshot,
} from './http-client';
import {
  createTabAuthorization,
  type StoredAuthorization,
  type TabLockManager,
} from './tab-authorization';

export interface SessionDto {
  id: string;
  label: string;
  createdAt: string;
  lastPresenceAt: string;
  expiresAt: string;
}
export interface RealAuthOptions {
  transport?: HttpTransport;
  origin?: string;
  storage?: Storage;
  locks?: TabLockManager;
  navigationType?: () => string;
  now?: () => number;
  randomSecret?: () => string;
  setTimer?: (
    callback: () => void,
    ms: number,
  ) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
  events?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}
export type RealAuthClient = AuthClient & {
  ready: Promise<void>;
  refresh: () => Promise<void>;
  request: <T>(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<HttpResult<T>>;
  openStream: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<HttpResult<Response>>;
};
function browserStorage(): Storage | undefined {
  try {
    return globalThis.sessionStorage;
  } catch {
    return undefined;
  }
}
function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
function validSession(value: unknown): value is SessionDto {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<SessionDto>;
  return (
    typeof s.id === 'string' &&
    /^[a-f0-9]{24}$/.test(s.id) &&
    typeof s.label === 'string' &&
    [s.createdAt, s.lastPresenceAt, s.expiresAt].every(
      (v) => typeof v === 'string' && Number.isFinite(Date.parse(v)),
    )
  );
}

export function createRealAuthClient(
  options: RealAuthOptions = {},
): RealAuthClient {
  const transport = options.transport ?? ((input, init) => fetch(input, init));
  const origin =
    options.origin ?? globalThis.location?.origin ?? 'http://localhost';
  const now = options.now ?? Date.now;
  const secret = options.randomSecret ?? randomSecret;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  const events =
    options.events ?? (typeof window === 'undefined' ? undefined : window);
  const identity = createTabAuthorization({
    storage: options.storage ?? browserStorage(),
    locks: options.locks ?? globalThis.navigator?.locks,
    navigationType:
      options.navigationType ??
      (() =>
        (
          performance.getEntriesByType('navigation')[0] as
            PerformanceNavigationTiming | undefined
        )?.type ?? 'navigate'),
  });
  let state: SessionState = { status: 'checking' };
  let generation = 0;
  let authorization: StoredAuthorization | null = null;
  let deadline = 0;
  let label = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  let presenceGeneration: number | undefined;
  let presenceAbort: AbortController | undefined;
  let refreshInFlight: Promise<void> | undefined;
  let cancelRefresh: (() => void) | undefined;
  let disposed = false;
  const listeners = new Set<() => void>();
  const publish = (next: SessionState) => {
    if (!disposed) {
      state = next;
      listeners.forEach((fn) => fn());
    }
  };
  const stop = () => {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
  };
  const finish = (reason: 'required' | 'expired' | 'closed') => {
    generation++;
    refreshInFlight = undefined;
    cancelRefresh?.();
    cancelRefresh = undefined;
    presenceAbort?.abort();
    presenceAbort = undefined;
    stop();
    authorization = null;
    identity.clear();
    identity.release();
    publish({ status: 'anonymous', reason });
  };
  const captured = (): AuthorizationSnapshot | null =>
    authorization
      ? {
          token: authorization.token,
          binding: authorization.binding,
          generation,
        }
      : null;
  const matches = (snapshot: AuthorizationSnapshot) =>
    snapshot.generation === generation &&
    snapshot.token === authorization?.token;
  const authorized = createAuthorizedHttpClient({
    transport,
    origin,
    authorization: captured,
    unauthorized: (snapshot) => {
      if (matches(snapshot)) finish('expired');
    },
  });
  const raw = createHttpClient(transport, () => {});
  const authorizedResponse = createAuthorizedResponseClient({
    transport,
    origin,
    authorization: captured,
    unauthorized: (snapshot) => {
      if (matches(snapshot)) finish('expired');
    },
  });
  // DELETE of a superseded, independently issued token must never target current.
  const revokeOrphan = async (token: string, binding: string) => {
    if (token === authorization?.token) return;
    await raw('/api/sessions/current', {
      method: 'DELETE',
      credentials: 'omit',
      redirect: 'error',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Tab-Authorization': binding,
      },
    });
  };
  const schedule = () => {
    stop();
    if (
      disposed ||
      !authorization ||
      state.status === 'closing' ||
      state.status === 'close-error'
    )
      return;
    const delay =
      state.status !== 'authenticated' || presenceGeneration === generation
        ? deadline - now()
        : Math.min(30_000, deadline - now());
    timer = setTimer(
      () => {
        timer = undefined;
        if (now() >= deadline) finish('expired');
        else void presence();
      },
      Math.max(0, delay),
    );
  };
  const presence = async () => {
    if (
      disposed ||
      !authorization ||
      state.status !== 'authenticated' ||
      presenceGeneration === generation
    )
      return;
    if (now() >= deadline) {
      finish('expired');
      return;
    }
    const snapshot = captured()!;
    const started = now();
    presenceGeneration = snapshot.generation;
    const controller = new AbortController();
    presenceAbort = controller;
    // One timer also enforces the deadline while the network request is pending.
    stop();
    timer = setTimer(
      () => {
        timer = undefined;
        if (matches(snapshot)) finish('expired');
      },
      Math.max(0, deadline - now()),
    );
    const result = await authorized<{
      lastPresenceAt: string;
      expiresAt: string;
    }>(
      '/api/sessions/current/presences',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: controller.signal,
      },
      200,
    );
    if (presenceGeneration === snapshot.generation)
      presenceGeneration = undefined;
    if (presenceAbort === controller) presenceAbort = undefined;
    if (!matches(snapshot) || disposed) return;
    if (now() >= deadline) {
      finish('expired');
      return;
    }
    if (
      result.kind === 'ok' &&
      typeof result.data?.expiresAt === 'string' &&
      typeof result.data.lastPresenceAt === 'string'
    ) {
      const remaining =
        Date.parse(result.data.expiresAt) -
        Date.parse(result.data.lastPresenceAt);
      if (Number.isFinite(remaining) && remaining > 0 && remaining <= 120_000) {
        deadline = started + remaining;
        authorization!.localExpiresAt = deadline;
        if (!identity.save(authorization!)) {
          finish('required');
          return;
        }
      }
    }
    if (now() >= deadline) finish('expired');
    else schedule();
  };
  const acceptSession = (session: SessionDto, started: number) => {
    label = session.label;
    // Duration relative to server's last presence avoids trusting the browser epoch.
    // For GET, retain the earlier local deadline; only presence can extend it.
    const candidate =
      started +
      Math.max(
        0,
        Math.min(
          120_000,
          Date.parse(session.expiresAt) - Date.parse(session.lastPresenceAt),
        ),
      );
    deadline = deadline ? Math.min(deadline, candidate) : candidate;
    if (now() >= deadline) {
      finish('expired');
      return;
    }
    if (authorization) {
      authorization.localExpiresAt = deadline;
      if (!identity.save(authorization)) {
        finish('required');
        return;
      }
    }
    publish({ status: 'authenticated', label });
    schedule();
  };
  const refresh = (): Promise<void> => {
    if (refreshInFlight) return refreshInFlight;
    if (
      !authorization ||
      disposed ||
      state.status === 'closing' ||
      state.status === 'close-error'
    )
      return Promise.resolve();
    if (deadline && now() >= deadline) {
      finish('expired');
      return Promise.resolve();
    }
    const snapshot = captured()!;
    const started = now();
    const revalidating = state.status === 'authenticated';
    stop();
    publish(
      revalidating ? { status: 'checking', label } : { status: 'checking' },
    );
    schedule();
    const controller = new AbortController();
    // Settle even when an injected transport (or body reader) ignores abort.
    const cancelled = new Promise<null>((resolve) => {
      cancelRefresh = () => {
        controller.abort();
        resolve(null);
      };
    });
    const job = (async () => {
      const result = await Promise.race([
        authorized<SessionDto>(
          '/api/sessions/current',
          { signal: controller.signal },
          200,
        ),
        cancelled,
      ]);
      if (!result || !matches(snapshot) || disposed) return;
      if (now() >= deadline) {
        finish('expired');
        return;
      }
      if (
        result.kind === 'ok' &&
        validSession(result.data) &&
        result.data.id === authorization?.sessionId
      )
        acceptSession(result.data, started);
      else if (result.kind !== 'unauthorized')
        publish({ status: 'connection-error' });
    })();
    refreshInFlight = job;
    void job.finally(() => {
      if (refreshInFlight === job) {
        refreshInFlight = undefined;
        cancelRefresh = undefined;
      }
    });
    return job;
  };
  const resume = () => {
    void refresh();
  };
  events?.addEventListener('pageshow', resume);
  events?.addEventListener('online', resume);
  events?.addEventListener('focus', resume);
  events?.addEventListener('resume', resume);
  // Ownership is deliberately retained through bfcache; pageshow validates again.
  const ready = (async () => {
    if (!identity.available()) {
      publish({ status: 'connection-error' });
      return;
    }
    const stored = identity.load();
    if (!stored) {
      publish({ status: 'anonymous' });
      return;
    }
    const revision = generation;
    const acquired = await identity.acquire(
      stored,
      () => !disposed && revision === generation,
    );
    if (disposed || revision !== generation) {
      if (acquired) identity.release(stored);
      return;
    }
    if (!acquired) {
      publish({ status: 'anonymous', reason: 'required' });
      return;
    }
    authorization = stored;
    deadline =
      typeof stored.localExpiresAt === 'number' &&
      Number.isFinite(stored.localExpiresAt)
        ? stored.localExpiresAt
        : 0;
    await refresh();
  })();
  return {
    ready,
    refresh,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    getSnapshot: () => state,
    async login(input: LoginInput): Promise<LoginResult> {
      if (disposed || !identity.available()) {
        publish({ status: 'connection-error' });
        return 'connection';
      }
      const revision = ++generation;
      refreshInFlight = undefined;
      cancelRefresh?.();
      cancelRefresh = undefined;
      presenceAbort?.abort();
      presenceAbort = undefined;
      stop();
      authorization = null;
      identity.clear();
      identity.release();
      deadline = 0;
      let binding: string;
      let tabId: string;
      try {
        binding = secret();
        tabId = secret();
      } catch {
        publish({ status: 'connection-error' });
        return 'connection';
      }
      publish({ status: 'checking' });
      const started = now();
      const result = await raw<{ session: SessionDto; sessionToken: string }>(
        '/api/sessions',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          redirect: 'error',
          cache: 'no-store',
          body: JSON.stringify({ ...input, tabBinding: binding }),
        },
        201,
      );
      if (disposed || revision !== generation) {
        if (
          result.kind === 'ok' &&
          typeof result.data?.sessionToken === 'string'
        )
          void revokeOrphan(result.data.sessionToken, binding);
        return 'superseded';
      }
      if (result.kind !== 'ok') {
        publish({ status: 'anonymous' });
        if (
          result.kind === 'error' &&
          result.status === 401 &&
          result.code === 'INVALID_CREDENTIALS'
        )
          return 'incorrect';
        if (
          result.kind === 'error' &&
          result.status === 429 &&
          result.code === 'AUTH_RATE_LIMITED'
        )
          return 'rate-limited';
        return 'connection';
      }
      if (
        !validSession(result.data?.session) ||
        !/^[A-Za-z0-9_-]{43}$/.test(result.data.sessionToken)
      ) {
        publish({ status: 'connection-error' });
        return 'connection';
      }
      const value: StoredAuthorization = {
        token: result.data.sessionToken,
        binding,
        tabId,
        sessionId: result.data.session.id,
        localExpiresAt:
          started +
          Math.min(
            120_000,
            Date.parse(result.data.session.expiresAt) -
              Date.parse(result.data.session.lastPresenceAt),
          ),
      };
      const acquired = await identity.acquire(
        value,
        () => !disposed && revision === generation,
      );
      if (disposed || revision !== generation) {
        if (identity.owns(value)) identity.release(value);
        void revokeOrphan(value.token, binding);
        return 'superseded';
      }
      if (!acquired) {
        void revokeOrphan(value.token, binding);
        publish({ status: 'connection-error' });
        return 'connection';
      }
      authorization = value;
      acceptSession(result.data.session, started);
      return authorization === value ? 'accepted' : 'connection';
    },
    async logout() {
      if (
        !authorization ||
        (state.status !== 'authenticated' &&
          state.status !== 'close-error' &&
          state.status !== 'connection-error')
      )
        return;
      generation++;
      refreshInFlight = undefined;
      cancelRefresh?.();
      cancelRefresh = undefined;
      presenceAbort?.abort();
      presenceAbort = undefined;
      const snapshot = captured()!;
      stop();
      publish({ status: 'closing', label });
      const result = await authorized<void>(
        '/api/sessions/current',
        { method: 'DELETE' },
        204,
      );
      if (!matches(snapshot) || disposed) return;
      if (result.kind === 'ok') finish('closed');
      else if (result.kind !== 'unauthorized')
        publish({
          status: 'close-error',
          label,
          uncertain:
            result.kind === 'connection' ||
            result.status >= 500 ||
            !result.code,
        });
    },
    openStream: async (input, init) => {
      if (state.status !== 'authenticated') return { kind: 'unauthorized' };
      if (now() >= deadline) {
        finish('expired');
        return { kind: 'unauthorized' };
      }
      const snapshot = captured()!;
      const result = await authorizedResponse(input, init, 200);
      if (!matches(snapshot)) {
        if (result.kind === 'ok') await result.data.body?.cancel();
        return { kind: 'error', status: 0, code: 'REQUEST_SUPERSEDED' };
      }
      return result;
    },
    request: async <T>(input: RequestInfo | URL, init?: RequestInit) => {
      if (state.status !== 'authenticated') return { kind: 'unauthorized' };
      if (now() >= deadline) {
        finish('expired');
        return { kind: 'unauthorized' };
      }
      const snapshot = captured()!;
      const result = await authorized<T>(input, init);
      if (!matches(snapshot))
        return { kind: 'error', status: 0, code: 'REQUEST_SUPERSEDED' };
      return result;
    },
    expire: () => finish('expired'),
    unauthorized: () => finish('required'),
    // Compatibility surface for the former demo UI: no fixture fallback.
    setScenario() {},
    getScenario: () => 'normal',
    setPresenceDelivery() {},
    dispose() {
      disposed = true;
      generation++;
      stop();
      authorization = null;
      refreshInFlight = undefined;
      cancelRefresh?.();
      cancelRefresh = undefined;
      presenceAbort?.abort();
      presenceAbort = undefined;
      identity.release();
      listeners.clear();
      events?.removeEventListener('pageshow', resume);
      events?.removeEventListener('online', resume);
      events?.removeEventListener('focus', resume);
      events?.removeEventListener('resume', resume);
    },
  };
}
