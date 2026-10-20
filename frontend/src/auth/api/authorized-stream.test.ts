import { expect, test, vi } from 'vitest';
import { createAuthorizedResponseClient } from './http-client';
import type { HttpTransport } from './contract.provisional';

test('stream shares origin restrictions, headers and session-generation callback, without JSON consumption', async () => {
  const authorization = {
    token: 'test-token',
    binding: 'test-binding',
    generation: 1,
  };
  const unauthorized = vi.fn();
  const transport = vi.fn<HttpTransport>(
    async () =>
      new Response(': heartbeat\n\n', {
        headers: { 'Content-Type': 'text/event-stream' },
      }),
  );
  const request = createAuthorizedResponseClient({
    transport,
    origin: 'http://localhost',
    authorization: () => authorization,
    unauthorized,
  });
  const response = await request('/api/dashboard-events');
  expect(response.kind).toBe('ok');
  if (response.kind === 'ok')
    expect(await response.data.text()).toBe(': heartbeat\n\n');
  const init = transport.mock.calls[0]![1]!;
  expect(new Headers(init.headers).get('Authorization')).toBe(
    'Bearer test-token',
  );
  expect(new Headers(init.headers).get('X-Tab-Authorization')).toBe(
    'test-binding',
  );
  expect(init).toMatchObject({
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
  });
  await request('https://other.invalid/api/dashboard-events');
  await request('/api/dashboard-events?token=no');
  expect(transport).toHaveBeenCalledOnce();
  transport.mockResolvedValueOnce(
    new Response(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'expired' } }),
      { status: 401 },
    ),
  );
  expect((await request('/api/dashboard-events')).kind).toBe('unauthorized');
  expect(unauthorized).toHaveBeenCalledWith(authorization);
});
