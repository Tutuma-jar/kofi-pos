import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router';
import { AuthContext } from '../auth-context';
import {
  createRealAuthClient,
  type RealAuthClient,
} from '../api/real-auth-client';
import { ProtectedRoute } from './ProtectedRoute';
import { MenuPage } from '../../menu/pages/MenuPage';
import { menuClient } from '../../menu/api/menu-client';

vi.mock('../../menu/api/menu-client', async () => {
  const actual = await vi.importActual<
    typeof import('../../menu/api/menu-client')
  >('../../menu/api/menu-client');
  const { createDemoClient } = await import('../../menu/api/demo-client');
  return { ...actual, menuClient: createDemoClient(0) };
});

const clients: RealAuthClient[] = [];
beforeEach(() => {
  menuClient.setScenario('normal');
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  vi.stubGlobal(
    'Image',
    class {
      naturalWidth = 100;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    },
  );
});
afterEach(() => {
  cleanup();
  clients.splice(0).forEach((client) => client.dispose());
  vi.unstubAllGlobals();
});

async function mount() {
  const events = new EventTarget();
  const values = new Map<string, string>();
  const storage: Storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
    key: (index) => [...values.keys()][index] ?? null,
    get length() {
      return values.size;
    },
  };
  const session = {
    id: 'a'.repeat(24),
    label: 'Operador',
    createdAt: new Date().toISOString(),
    lastPresenceAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
  };
  let resolveRefresh!: (response: Response) => void;
  const pending = new Promise<Response>((resolve) => {
    resolveRefresh = resolve;
  });
  const transport = vi.fn(
    async (_url: RequestInfo | URL, init?: RequestInit) =>
      init?.method === 'POST'
        ? new Response(
            JSON.stringify({ session, sessionToken: 'T'.repeat(43) }),
            { status: 201 },
          )
        : pending,
  );
  const client = createRealAuthClient({
    transport,
    storage,
    origin: 'http://localhost',
    events: events as unknown as Window,
    locks: { request: async (_name, _options, callback) => callback({}) },
    navigationType: () => 'navigate',
    randomSecret: () => 'B'.repeat(43),
    setTimer: () => 0 as unknown as ReturnType<typeof setTimeout>,
    clearTimer: () => {},
  });
  clients.push(client);
  await client.ready;
  await client.login({ username: 'test', password: 'test-only' });
  render(
    <MemoryRouter initialEntries={['/menu']}>
      <AuthContext value={client}>
        <Routes>
          <Route
            path="/menu"
            element={
              <ProtectedRoute>
                <MenuPage />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<h1>Inicio de sesión</h1>} />
        </Routes>
      </AuthContext>
    </MemoryRouter>,
  );
  await screen.findByText('Espresso');
  return { client, events, transport, resolveRefresh, session };
}

test.each(['crear', 'editar'])(
  'conserva formulario e imagen al recuperar foco para %s',
  async (mode) => {
    const { client, events, transport, resolveRefresh, session } =
      await mount();
    fireEvent.click(
      mode === 'crear'
        ? screen.getByText('Agregar producto')
        : screen.getByLabelText('Editar Espresso'),
    );
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Borrador conservado' },
    });
    const input = screen.getByLabelText('Imagen opcional') as HTMLInputElement;
    const file = new File([new Uint8Array([255, 216, 255, 0])], 'prueba.jpg', {
      type: 'image/jpeg',
    });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new Uint8Array([255, 216, 255, 0]).buffer,
    });
    act(() => {
      events.dispatchEvent(new Event('focus'));
    });
    expect(client.getSnapshot().status).toBe('checking');
    expect(dialog.isConnected).toBe(true);
    expect(dialog.hasAttribute('open')).toBe(true);
    expect(dialog.inert).toBe(true);
    expect(await client.request('/api/blocked-during-check')).toEqual({
      kind: 'unauthorized',
    });
    expect(transport).toHaveBeenCalledTimes(2);
    fireEvent.change(input, { target: { files: [file] } });
    await screen.findByAltText('Vista previa del producto');
    await act(async () => {
      resolveRefresh(new Response(JSON.stringify(session), { status: 200 }));
      await client.refresh();
    });
    expect(screen.getByRole('dialog')).toBe(dialog);
    expect(dialog.inert).toBe(false);
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe(
      'Borrador conservado',
    );
    expect(
      (screen.getByLabelText('Imagen opcional') as HTMLInputElement).files?.[0],
    ).toBe(file);
    expect(
      screen.getByAltText('Vista previa del producto').getAttribute('src'),
    ).toMatch(/^data:image\/jpeg;base64,/);
  },
);

test('retira el formulario al expirar durante la comprobación e ignora una respuesta tardía', async () => {
  const { client, events, resolveRefresh, session } = await mount();
  fireEvent.click(screen.getByText('Agregar producto'));
  const dialog = await screen.findByRole('dialog');
  act(() => {
    events.dispatchEvent(new Event('focus'));
  });
  expect(dialog.isConnected).toBe(true);
  await act(async () => {
    client.expire();
    resolveRefresh(new Response(JSON.stringify(session), { status: 200 }));
    await Promise.resolve();
  });
  await screen.findByText('Inicio de sesión');
  expect(dialog.isConnected).toBe(false);
  expect(client.getSnapshot()).toEqual({
    status: 'anonymous',
    reason: 'expired',
  });
});

test.each([401, 503])(
  'retira el formulario si la revalidación responde %s',
  async (status) => {
    const { client, events, resolveRefresh } = await mount();
    fireEvent.click(screen.getByText('Agregar producto'));
    const dialog = await screen.findByRole('dialog');
    act(() => {
      events.dispatchEvent(new Event('focus'));
    });
    expect(dialog.isConnected).toBe(true);
    await act(async () => {
      resolveRefresh(
        new Response(
          JSON.stringify({
            error: {
              code: status === 401 ? 'SESSION_EXPIRED' : 'INTERNAL_ERROR',
              message: 'test',
            },
          }),
          { status },
        ),
      );
      await client.refresh();
    });
    await screen.findByText('Inicio de sesión');
    expect(dialog.isConnected).toBe(false);
  },
);
