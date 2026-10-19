import type { HttpResult, HttpTransport } from './contract.provisional';

/** Transporte inyectado: ninguna URL, autorización o endpoint real presupuestos. */
export function createHttpClient(
  transport: HttpTransport,
  onUnauthorized: () => void,
) {
  return async function request<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<HttpResult<T>> {
    let response: Response;
    try {
      response = await transport(input, init);
    } catch {
      return { kind: 'connection' };
    }
    if (response.status === 401) {
      onUnauthorized();
      return { kind: 'unauthorized' };
    }
    if (!response.ok) return { kind: 'error', status: response.status };
    try {
      return { kind: 'ok', data: (await response.json()) as T };
    } catch {
      return { kind: 'error', status: response.status };
    }
  };
}
