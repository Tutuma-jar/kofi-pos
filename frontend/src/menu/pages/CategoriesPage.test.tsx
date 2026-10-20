import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { HttpResult } from '../../auth/api/contract.provisional';
import { menuMessages } from '../api/real-menu-client';
import { CategoriesPage } from './CategoriesPage';

// US-008 walkthrough with the real client over an in-memory server that
// follows the HTTP contract of TASK-020 (no demo data).
const api = vi.hoisted(() => {
  type CategoryDto = { id: string; name: string; version: number };
  const state = {
    categories: [] as CategoryDto[],
    used: new Set<string>(),
    // Another session renames the category right before the next write.
    interloper: false,
    failLists: 0,
    calls: [] as string[],
  };
  const key = (name: string) => name.trim().toLowerCase();
  function reset() {
    state.categories = [
      { id: 'a'.repeat(24), name: 'Bebidas', version: 1 },
      { id: 'b'.repeat(24), name: 'Postres', version: 1 },
    ];
    state.used = new Set(['b'.repeat(24)]);
    state.interloper = false;
    state.failLists = 0;
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
      return state.failLists && state.failLists--
        ? { kind: 'error', status: 500, code: 'INTERNAL_ERROR' }
        : { kind: 'ok', data: { items: [] } };
    if (method === 'GET' && path === '/api/categories')
      return {
        kind: 'ok',
        data: { items: state.categories.map((item) => ({ ...item })) },
      };
    const match = /^\/api\/categories\/([a-f0-9]{24})$/.exec(path);
    const category =
      match && state.categories.find((item) => item.id === match[1]);
    if (!category) return { kind: 'error', status: 404, code: 'NOT_FOUND' };
    const body = JSON.parse(String(init.body)) as {
      version: number;
      name?: string;
    };
    if (state.interloper) {
      state.interloper = false;
      category.name = `${category.name} (editada)`;
      category.version += 1;
    }
    if (body.version !== category.version)
      return {
        kind: 'error',
        status: 409,
        code: 'VERSION_CONFLICT',
        details: { current: { ...category } },
      };
    if (method === 'DELETE') {
      if (state.used.has(category.id))
        return { kind: 'error', status: 409, code: 'CATEGORY_NOT_EMPTY' };
      state.categories = state.categories.filter((item) => item !== category);
      return { kind: 'ok', data: null };
    }
    const name = String(body.name);
    if (
      state.categories.some(
        (item) => item !== category && key(item.name) === key(name),
      )
    )
      return { kind: 'error', status: 409, code: 'DUPLICATE_NAME' };
    category.name = name.trim();
    category.version += 1;
    return { kind: 'ok', data: { ...category } };
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
beforeEach(() => {
  api.reset();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount() {
  render(
    <MemoryRouter>
      <CategoriesPage />
    </MemoryRouter>,
  );
}
function rename(from: string, to: string) {
  fireEvent.click(screen.getByLabelText(`Renombrar ${from}`));
  fireEvent.change(screen.getByLabelText('Nombre de categoría'), {
    target: { value: to },
  });
  fireEvent.click(screen.getByText('Guardar categoría'));
}

describe('US-008 administración de categorías con el cliente real', () => {
  it('CA-03 renombra con la versión vista y conserva la identidad', async () => {
    mount();
    await screen.findByText('Bebidas');
    rename('Bebidas', 'Bebidas calientes');
    await screen.findByText('Bebidas calientes');
    expect(screen.getByText('Categoría guardada.')).toBeTruthy();
    expect(api.state.calls).toContain(
      `PATCH /api/categories/${'a'.repeat(24)}`,
    );
    expect(api.state.categories[0]).toMatchObject({
      id: 'a'.repeat(24),
      version: 2,
    });
  });

  it('CA-02 el duplicado se comunica en el campo, sin aviso de reintento', async () => {
    mount();
    await screen.findByText('Bebidas');
    rename('Bebidas', '  postres ');
    const input = screen.getByLabelText('Nombre de categoría');
    await waitFor(() =>
      expect(input.getAttribute('aria-invalid')).toBe('true'),
    );
    expect(screen.getByText(menuMessages.duplicate)).toBeTruthy();
    expect(screen.queryByText('Reintentar')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(input));
    // Editing the name clears the server rejection.
    fireEvent.change(input, { target: { value: 'Postres fríos' } });
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(api.state.categories[0]).toMatchObject({
      name: 'Bebidas',
      version: 1,
    });
  });

  it('CA-05 conflicto: mensaje exacto y recarga de la versión vigente', async () => {
    mount();
    await screen.findByText('Bebidas');
    api.state.interloper = true;
    rename('Bebidas', 'Infusiones');
    expect((await screen.findByRole('alert')).textContent).toContain(
      menuMessages.conflict,
    );
    await waitFor(() =>
      expect(
        (screen.getByLabelText('Nombre de categoría') as HTMLInputElement)
          .value,
      ).toBe('Bebidas (editada)'),
    );
    expect(api.state.categories[0]).toMatchObject({
      name: 'Bebidas (editada)',
      version: 2,
    });
    // With the reloaded version the rename applies.
    fireEvent.change(screen.getByLabelText('Nombre de categoría'), {
      target: { value: 'Infusiones' },
    });
    fireEvent.click(screen.getByText('Guardar categoría'));
    await screen.findByText('Infusiones');
    expect(api.state.categories[0]).toMatchObject({ version: 3 });
  });

  it('CA-05 si la recarga tras el conflicto falla, el conflicto sigue visible', async () => {
    mount();
    await screen.findByText('Bebidas');
    api.state.interloper = true;
    api.state.failLists = 1;
    rename('Bebidas', 'Infusiones');
    expect((await screen.findByRole('alert')).textContent).toContain(
      menuMessages.conflict,
    );
    await waitFor(() =>
      expect(screen.getByText('Guardar categoría')).toHaveProperty(
        'disabled',
        false,
      ),
    );
    // Retry reloads the list with the current version.
    fireEvent.click(screen.getByText('Reintentar'));
    await screen.findByText('Bebidas (editada)');
  });

  it('CA-04 elimina una categoría vacía y protege la que tiene productos', async () => {
    mount();
    await screen.findByText('Postres');
    fireEvent.click(screen.getByLabelText('Eliminar Postres'));
    expect((await screen.findByRole('alert')).textContent).toContain(
      menuMessages.notEmpty,
    );
    expect(screen.getByText('Postres')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Eliminar Bebidas'));
    await waitFor(() => expect(screen.queryByText('Bebidas')).toBeNull());
    expect(screen.getByText('Categoría eliminada.')).toBeTruthy();
    expect(api.state.categories.map((item) => item.name)).toEqual(['Postres']);
  });

  it('CA-07 un fallo no se presenta como ausencia y el reintento carga', async () => {
    api.state.failLists = 1;
    mount();
    expect((await screen.findByRole('alert')).textContent).toContain(
      menuMessages.connection,
    );
    expect(
      screen.queryByText(
        'Aún no hay categorías. Crea la primera para organizar el menú.',
      ),
    ).toBeNull();
    fireEvent.click(screen.getByText('Reintentar'));
    await screen.findByText('Bebidas');
  });

  it('CA-07 sin categorías muestra el vacío y permite crear', async () => {
    api.state.categories = [];
    mount();
    await screen.findByText(
      'Aún no hay categorías. Crea la primera para organizar el menú.',
    );
    fireEvent.click(screen.getByText('Agregar categoría'));
    expect(screen.getByLabelText('Nombre de categoría')).toBeTruthy();
  });
});
