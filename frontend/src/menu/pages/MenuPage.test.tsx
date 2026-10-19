import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AuthContext } from '../../auth/auth-context';
import { createAuthClient } from '../../auth/api/auth-client';
import { menuClient } from '../api/menu-client';
import { MenuPage } from './MenuPage';
beforeEach(() => {
  menuClient.setScenario('normal');
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
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
describe('Recorridos del catálogo', () => {
  it('ordena activos e inactivos, busca y filtra', async () => {
    const auth = mount();
    await screen.findByText('Café con leche');
    const rows = screen.getAllByRole('row');
    expect(rows[1]?.textContent).toContain('Café con leche');
    expect(rows.at(-1)?.textContent).toContain('Limonada');
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'inactive' },
    });
    expect(screen.getAllByRole('row')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText('Buscar por nombre'), {
      target: { value: '  LIMONADA  ' },
    });
    expect(screen.getByText('Limonada')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Categoría'), {
      target: { value: 'coffee' },
    });
    expect(
      screen.getByText('Ningún producto coincide con los filtros'),
    ).toBeTruthy();
    auth.dispose();
  });
  it('protege borrador al cancelar y restaura el foco', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    const add = screen.getByText('Agregar producto');
    add.focus();
    fireEvent.click(add);
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Borrador' },
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(add);
    auth.dispose();
  });
  it('crea y edita un producto mediante el formulario', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    fireEvent.click(screen.getByText('Agregar producto'));
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Chocolate' },
    });
    fireEvent.change(screen.getByLabelText('Descripción'), {
      target: { value: 'Cacao caliente' },
    });
    fireEvent.change(screen.getByLabelText('Precio (BOB)'), {
      target: { value: '22.5' },
    });
    fireEvent.change(
      screen.getByLabelText('Categoría', { selector: '#product-category' }),
      { target: { value: 'coffee' } },
    );
    fireEvent.click(screen.getByText('Guardar producto'));
    await screen.findByText('Chocolate');
    fireEvent.click(screen.getByLabelText('Editar Chocolate'));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Chocolate caliente' },
    });
    fireEvent.click(screen.getByText('Guardar producto'));
    await screen.findByText('Chocolate caliente');
    expect(screen.getByText('BOB 22.5')).toBeTruthy();
    auth.dispose();
  });
  it('no convierte fallo de consulta en vacío y recupera con reintento', async () => {
    menuClient.setScenario('connection');
    const auth = mount();
    await screen.findByRole('alert');
    expect(
      screen.queryByText(
        'Aún no hay productos. Agrega el primero para empezar a vender.',
      ),
    ).toBeNull();
    menuClient.setScenario('normal');
    fireEvent.click(screen.getByText('Reintentar'));
    await waitFor(() => expect(screen.getByText('Espresso')).toBeTruthy());
    auth.dispose();
  });
});
