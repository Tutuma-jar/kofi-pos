import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { AccessRoutes } from './App';
import { createAuthClient } from './auth/api/auth-client';
import { createHttpClient } from './auth/api/http-client';
import type {
  AuthClient,
  AuthClientOptions,
  Scenario,
} from './auth/api/contract.provisional';

const clients: AuthClient[] = [];
let narrow = false;
let mediaListener: (() => void) | undefined;
const originalShowModal = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'showModal',
);
const originalClose = Object.getOwnPropertyDescriptor(
  HTMLDialogElement.prototype,
  'close',
);

beforeEach(() => {
  vi.useFakeTimers();
  narrow = false;
  mediaListener = undefined;
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return narrow;
      },
      addEventListener: (_event: string, listener: () => void) => {
        mediaListener = listener;
      },
      removeEventListener: vi.fn(),
    })),
  );
  // jsdom no implementa top-layer/inert. Solo suplimos apertura nativa;
  // las aserciones no acreditan foco o aislamiento en navegador real.
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      }),
    },
    close: {
      configurable: true,
      value: vi.fn(function (this: HTMLDialogElement) {
        this.removeAttribute('open');
      }),
    },
  });
});

afterEach(() => {
  cleanup();
  clients.forEach((client) => client.dispose());
  clients.length = 0;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalShowModal)
    Object.defineProperty(
      HTMLDialogElement.prototype,
      'showModal',
      originalShowModal,
    );
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose)
    Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
  else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

function mount(path = '/login', options: AuthClientOptions = {}) {
  const client = createAuthClient({
    initial: { status: 'anonymous' },
    ...options,
  });
  clients.push(client);
  render(
    <MemoryRouter initialEntries={[path]}>
      <AccessRoutes client={client} />
    </MemoryRouter>,
  );
  return client;
}

async function settle(ms = 650) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function fillLogin() {
  fireEvent.change(screen.getByLabelText('Usuario'), {
    target: { value: 'operador-demo' },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'solo-simulacion' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

test('ruta protegida sin sesión y comprobación inicial no muestran contenido protegido', async () => {
  mount('/dashboard', { initial: { status: 'checking' } });
  expect(screen.getByRole('status').textContent).toContain(
    'Comprobando sesión',
  );
  expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  await settle(180);
  expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeDefined();
  expect(document.title).toBe('Iniciar sesión · Kofi');
  expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
});

test('login vacío usa campos requeridos y no inicia sesión', () => {
  const client = mount();
  const username = screen.getByLabelText<HTMLInputElement>('Usuario');
  expect(username.value).toBe('');
  expect(username.required).toBe(true);
  expect(screen.getByLabelText<HTMLInputElement>('Contraseña').required).toBe(
    true,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
  expect(client.getSnapshot().status).toBe('anonymous');
});

test.each<Scenario>(['incorrect', 'connection'])(
  'login distingue %s sin conceder acceso',
  async (scenario) => {
    const client = mount();
    act(() => client.setScenario(scenario));
    fillLogin();
    expect(
      screen.getByRole<HTMLButtonElement>('button', {
        name: 'Iniciando sesión…',
      }).disabled,
    ).toBe(true);
    await settle();
    expect(screen.getByRole('alert').textContent).toContain(
      scenario === 'incorrect'
        ? 'Usuario o contraseña incorrectos'
        : 'No pudimos conectar',
    );
    expect(client.getSnapshot().status).toBe('anonymous');
    expect(screen.getByLabelText<HTMLInputElement>('Contraseña').value).toBe(
      '',
    );
  },
);

test('login aceptado llega directamente al destino Dashboard', async () => {
  mount('/login');
  fillLogin();
  await settle();
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeDefined();
  expect(
    screen.getByRole('group', { name: 'Período de ventas' }),
  ).toBeDefined();
  expect(document.title).toBe('Dashboard · Kofi');
});

test.each(['expire', 'unauthorized'] as const)(
  '%s retira Dashboard y exige nuevo login',
  (action) => {
    const client = mount('/dashboard', {
      initial: { status: 'authenticated', label: 'Cuenta compartida' },
    });
    act(() => client[action]());
    expect(
      screen.getByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
    expect(screen.getByRole('status').textContent).toContain(
      action === 'expire'
        ? 'Tu sesión finalizó'
        : 'Inicia sesión para continuar',
    );
  },
);

test('401 de transporte inyectado propaga pérdida de autorización sin red', async () => {
  const client = mount('/dashboard', {
    initial: { status: 'authenticated', label: 'Cuenta compartida' },
  });
  const request = createHttpClient(
    async () => new Response(null, { status: 401 }),
    client.unauthorized,
  );
  await act(async () => {
    expect(await request('/fixture')).toEqual({ kind: 'unauthorized' });
  });
  expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeDefined();
});

test('menú oculto desmonta controles; al ocultarlo devuelve foco al disparador', () => {
  mount('/dashboard', {
    initial: { status: 'authenticated', label: 'Cuenta compartida' },
  });
  expect(screen.queryByRole('navigation')).toBeNull();
  const toggle = screen.getByRole('button', { name: 'Abrir navegación' });
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  screen.getByRole('button', { name: 'Cerrar sesión' }).focus();
  fireEvent.click(toggle);
  expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
  expect(document.activeElement).toBe(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
});

test('modal estrecho declara fondo inerte, contiene extremos Tab y permite cancelar con retorno', () => {
  narrow = true;
  mount('/dashboard', {
    initial: { status: 'authenticated', label: 'Cuenta compartida' },
  });
  const toggle = screen.getByRole('button', { name: 'Abrir navegación' });
  fireEvent.click(toggle);
  const dialog = screen.getByRole('dialog', { name: 'Navegación' });
  const close = within(dialog).getByRole('button', {
    name: 'Cerrar navegación',
  });
  const logout = within(dialog).getByRole('button', { name: 'Cerrar sesión' });
  expect(document.activeElement).toBe(close);
  expect(toggle.closest('[inert]')).not.toBeNull();
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  expect(document.activeElement).toBe(logout);
  fireEvent.keyDown(logout, { key: 'Tab' });
  expect(document.activeElement).toBe(close);
  // Escape dispara cancel en navegador; jsdom requiere enviar ese evento.
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
  expect(document.activeElement).toBe(toggle);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.body.style.overflow).toBe('');
});

test('cambiar de ancho cierra menú y limpia bloqueo del fondo', () => {
  narrow = true;
  mount('/dashboard', {
    initial: { status: 'authenticated', label: 'Cuenta compartida' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
  expect(document.body.style.overflow).toBe('hidden');
  act(() => {
    narrow = false;
    mediaListener?.();
  });
  expect(document.body.style.overflow).toBe('');
  expect(screen.queryByRole('navigation')).toBeNull();
});

test('logout pendiente suspende contenido y solo confirma éxito al resolver', async () => {
  mount('/dashboard', {
    initial: { status: 'authenticated', label: 'Cuenta compartida' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
  expect(
    screen.getByRole('heading', { name: 'Cerrando sesión…' }),
  ).toBeDefined();
  expect(
    screen.getByRole('heading', { name: 'Dashboard' }).closest('[inert]'),
  ).not.toBeNull();
  expect(screen.queryByRole('heading', { name: 'Iniciar sesión' })).toBeNull();
  await settle();
  expect(screen.getByRole('status').textContent).toContain('Sesión cerrada');
  expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeDefined();
  expect(document.title).toBe('Iniciar sesión · Kofi');
});

test('cierre desde modal enfoca estado visible y permite reabrir/cerrar sin foco inerte', async () => {
  narrow = true;
  const client = mount('/dashboard', {
    initial: { status: 'authenticated', label: 'Cuenta compartida' },
  });
  act(() => client.setScenario('close-uncertain'));
  fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
  const dialog = screen.getByRole('dialog', { name: 'Navegación' });
  const logout = within(dialog).getByRole('button', { name: 'Cerrar sesión' });
  logout.focus();
  fireEvent.click(logout);
  const status = screen.getByRole('heading', { name: 'Cerrando sesión…' });
  expect(document.activeElement).toBe(status);
  expect(status.closest('[inert]')).toBeNull();
  expect(logout.isConnected).toBe(false);
  await settle();
  expect(
    screen.getByRole('heading', { name: 'El cierre no está confirmado' }),
  ).toBeDefined();
  const toggle = screen.getByRole('button', { name: 'Abrir navegación' });
  fireEvent.click(toggle);
  const reopened = screen.getByRole('dialog', { name: 'Navegación' });
  fireEvent.click(
    within(reopened).getByRole('button', { name: 'Cerrar navegación' }),
  );
  expect(document.activeElement).toBe(toggle);
  expect(toggle.closest('[inert]')).toBeNull();
});

test('un estado de cierre externo no intenta enfocar el fondo de un menú modal abierto', async () => {
  narrow = true;
  const client = mount('/dashboard', {
    initial: { status: 'authenticated', label: 'Cuenta compartida' },
  });
  act(() => client.setScenario('close-uncertain'));
  fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
  const dialog = screen.getByRole('dialog', { name: 'Navegación' });
  const close = within(dialog).getByRole('button', {
    name: 'Cerrar navegación',
  });
  expect(document.activeElement).toBe(close);
  act(() => {
    void client.logout();
  });
  expect(document.activeElement).toBe(close);
  expect(document.activeElement?.closest('[inert]')).toBeNull();
  await settle();
  expect(document.activeElement).toBe(close);
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
  const toggle = screen.getByRole('button', { name: 'Abrir navegación' });
  expect(document.activeElement).toBe(toggle);
  expect(toggle.closest('[inert]')).toBeNull();
});

test.each<Scenario>(['close-failed', 'close-uncertain'])(
  '%s no finge cierre; admite reintento de escenario',
  async (scenario) => {
    const client = mount('/dashboard', {
      initial: { status: 'authenticated', label: 'Cuenta compartida' },
    });
    act(() => client.setScenario(scenario));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir navegación' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    await settle();
    expect(
      screen.getByRole('heading', { name: 'El cierre no está confirmado' }),
    ).toBeDefined();
    expect(
      screen.queryByRole('heading', { name: 'Iniciar sesión' }),
    ).toBeNull();
    if (scenario === 'close-uncertain')
      expect(screen.getByText(/No podemos afirmar/)).toBeDefined();
    act(() => client.setScenario('normal'));
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar cierre' }));
    await settle();
    expect(screen.getByRole('status').textContent).toContain('Sesión cerrada');
  },
);

test('una respuesta de login tardía no repone acceso tras 401', async () => {
  const client = mount('/login');
  fillLogin();
  act(() => client.unauthorized());
  await settle();
  expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeDefined();
  expect(client.getSnapshot()).toEqual({
    status: 'anonymous',
    reason: 'required',
  });
});
