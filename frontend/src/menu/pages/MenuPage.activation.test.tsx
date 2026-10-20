import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { HttpResult } from '../../auth/api/contract.provisional';
import { AuthContext } from '../../auth/auth-context';
import { createAuthClient } from '../../auth/api/auth-client';
import { productMessages, type ProductDto } from '../api/real-menu-client';
import { MenuPage } from './MenuPage';

// US-009 walkthrough with the real client over an in-memory server that
// follows the HTTP contract of TASK-016/018/022 (no demo data).
const api = vi.hoisted(() => {
  const category = {
    id: '0123456789abcdef01234567',
    name: 'Bebidas',
    version: 1,
  };
  const state = {
    products: [] as ProductDto[],
    interloper: false,
    calls: [] as string[],
  };
  const make = (id: string, name: string): ProductDto => ({
    id,
    name,
    version: 1,
    description: 'De la casa.',
    priceTenths: 105,
    categoryId: category.id,
    imageId: null,
    active: true,
  });
  function reset() {
    state.products = [
      make('a'.repeat(24), 'Espresso'),
      make('b'.repeat(24), 'Té verde'),
    ];
    state.interloper = false;
    state.calls = [];
  }
  async function request(
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<HttpResult<unknown>> {
    const path = String(input);
    const method = init.method ?? 'GET';
    state.calls.push(`${method} ${path}`);
    if (method === 'GET' && path === '/api/products')
      return {
        kind: 'ok',
        data: {
          items: [...state.products]
            .sort(
              (a, b) =>
                Number(b.active) - Number(a.active) ||
                a.name.localeCompare(b.name, 'es'),
            )
            .map((p) => ({ ...p })),
        },
      };
    if (method === 'GET' && path === '/api/categories')
      return { kind: 'ok', data: { items: [category] } };
    const match = /^\/api\/products\/([a-f0-9]{24})\/activation$/.exec(path);
    const product = match && state.products.find((p) => p.id === match[1]);
    if (method === 'PATCH' && product) {
      const body = JSON.parse(String(init.body)) as {
        version: number;
        active: boolean;
      };
      if (state.interloper) {
        // Another session saved an edition first.
        state.interloper = false;
        product.name = `${product.name} (editado)`;
        product.version += 1;
      }
      if (body.version !== product.version)
        return {
          kind: 'error',
          status: 409,
          code: 'VERSION_CONFLICT',
          details: { current: { ...product } },
        };
      if (product.active !== body.active) {
        product.active = body.active;
        product.version += 1;
      }
      return { kind: 'ok', data: { ...product } };
    }
    return { kind: 'error', status: 404, code: 'NOT_FOUND' };
  }
  return { state, reset, request };
});
vi.mock('../api/menu-client', async () => {
  const actual =
    await vi.importActual<typeof import('../api/menu-client')>(
      '../api/menu-client',
    );
  const { createRealMenuClient } = await import('../api/real-menu-client');
  return {
    ...actual,
    menuClient: createRealMenuClient({ request: api.request }),
  };
});
beforeEach(() => api.reset());
afterEach(() => cleanup());
function mount() {
  const client = createAuthClient({
    initial: { status: 'authenticated', label: 'Demo' },
  });
  render(
    <MemoryRouter>
      <AuthContext value={client}>
        <MenuPage />
      </AuthContext>
    </MemoryRouter>,
  );
  return client;
}
const espresso = 'a'.repeat(24);

describe('US-009 activación con el cliente real', () => {
  it('CA-01/CA-02 desactiva: etiqueta Inactivo, al final y visible con el filtro inactivos', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    fireEvent.click(screen.getByLabelText('Desactivar Espresso'));
    await screen.findByLabelText('Reactivar Espresso');
    await waitFor(() =>
      expect(screen.getByRole('status').textContent).toBe(
        'Espresso: inactivo.',
      ),
    );
    const last = screen.getAllByRole('row').at(-1);
    expect(last?.textContent).toContain('Espresso');
    expect(within(last as HTMLElement).getByText('Inactivo')).toBeTruthy();
    expect(api.state.calls).toContain(
      `PATCH /api/products/${espresso}/activation`,
    );
    expect(api.state.products[0]).toMatchObject({
      name: 'Espresso',
      active: false,
      version: 2,
    });
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'inactive' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    expect(screen.queryByText('Té verde')).toBeNull();
    auth.dispose();
  });

  it('CA-03 reactiva sin registrarlo otra vez', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    fireEvent.click(screen.getByLabelText('Desactivar Espresso'));
    fireEvent.click(await screen.findByLabelText('Reactivar Espresso'));
    await screen.findByLabelText('Desactivar Espresso');
    const first = screen.getAllByRole('row')[1];
    expect(first?.textContent).toContain('Espresso');
    expect(within(first as HTMLElement).getByText('Activo')).toBeTruthy();
    expect(api.state.products).toHaveLength(2);
    expect(api.state.products[0]).toMatchObject({ active: true, version: 3 });
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'active' },
    });
    expect(screen.getByText('Espresso')).toBeTruthy();
    auth.dispose();
  });

  it('CA-05 conflicto: mensaje exacto, recarga la lista y no aplica el cambio', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    api.state.interloper = true;
    fireEvent.click(screen.getByLabelText('Desactivar Espresso'));
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
    );
    expect(productMessages.conflict).toBe(
      'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
    );
    await screen.findByLabelText('Desactivar Espresso (editado)');
    expect(api.state.products[0]).toMatchObject({ active: true, version: 2 });
    expect(
      api.state.calls.filter((call) => call === 'GET /api/products'),
    ).toHaveLength(2);
    // With the reloaded version the change applies.
    fireEvent.click(screen.getByLabelText('Desactivar Espresso (editado)'));
    await screen.findByLabelText('Reactivar Espresso (editado)');
    auth.dispose();
  });
});
