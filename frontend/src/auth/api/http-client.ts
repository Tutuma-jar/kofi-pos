import type { HttpResult, HttpTransport } from './contract.provisional';

/** Transporte inyectado: ninguna URL, autorización o endpoint real presupuestos. */
export function createHttpClient(
  transport: HttpTransport,
  onUnauthorized: () => void,
) {
  return async function request<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
    expectedStatus?: number,
  ): Promise<HttpResult<T>> {
    let response: Response;
    try {
      response = await transport(input, init);
    } catch {
      return { kind: 'connection' };
    }
    if (!response.ok) {
      let failure: { code?: string; details?: unknown } = {};
      try {
        const body: unknown = await response.json();
        if (typeof body === 'object' && body !== null && 'error' in body) {
          const error = body.error;
          if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            typeof error.code === 'string' &&
            'message' in error &&
            typeof error.message === 'string'
          ) {
            failure = {
              code: error.code,
              ...('details' in error ? { details: error.details } : {}),
            };
          }
        }
      } catch {
        /* A non-JSON failure is not a successful response. */
      }
      if (response.status === 401 && failure.code !== 'INVALID_CREDENTIALS') {
        onUnauthorized();
        return { kind: 'unauthorized', ...failure };
      }
      return { kind: 'error', status: response.status, ...failure };
    }
    if (expectedStatus !== undefined && response.status !== expectedStatus)
      return { kind: 'error', status: response.status };
    if (response.status === 204) return { kind: 'ok', data: undefined as T };
    try {
      return { kind: 'ok', data: (await response.json()) as T };
    } catch {
      return { kind: 'error', status: response.status };
    }
  };
}

export type AuthorizationSnapshot = {
  token: string;
  binding: string;
  generation: number;
};

/** Capture authorization per request; an old 401 must not terminate a newer login. */
export function createAuthorizedHttpClient(options: {
  transport: HttpTransport;
  origin: string;
  authorization: () => AuthorizationSnapshot | null;
  unauthorized: (captured: AuthorizationSnapshot) => void;
}) {
  return async <T>(
    input: RequestInfo | URL,
    init?: RequestInit,
    expectedStatus?: number,
  ): Promise<HttpResult<T>> => {
    const raw = input instanceof Request ? input.url : String(input);
    let url: URL;
    try {
      url = new URL(raw, options.origin);
    } catch {
      return { kind: 'error', status: 0 };
    }
    // Never send tab secrets, even explicitly supplied headers, to another origin.
    if (
      url.origin !== new URL(options.origin).origin ||
      !url.pathname.startsWith('/api/') ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return { kind: 'error', status: 0 };
    }
    const captured = options.authorization();
    if (!captured) return { kind: 'unauthorized' };
    const headers = new Headers(
      input instanceof Request ? input.headers : undefined,
    );
    new Headers(init?.headers).forEach((value, name) =>
      headers.set(name, value),
    );
    headers.set('Authorization', `Bearer ${captured.token}`);
    headers.set('X-Tab-Authorization', captured.binding);
    const request = createHttpClient(options.transport, () =>
      options.unauthorized(captured),
    );
    return request<T>(
      input,
      {
        ...init,
        headers,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
      },
      expectedStatus,
    );
  };
}
