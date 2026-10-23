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
import { menuClient, MenuError } from '../api/menu-client';
import { MenuPage } from './MenuPage';
// UI walkthroughs run on the simulated source; the real API client has its own tests.
vi.mock('../api/menu-client', async () => {
  const actual =
    await vi.importActual<typeof import('../api/menu-client')>(
      '../api/menu-client',
    );
  const { createDemoClient } = await import('../api/demo-client');
  return { ...actual, menuClient: createDemoClient(10) };
});
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
  it('limpia los filtros desde el vacío y recupera el recuento', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    const total = (await menuClient.list()).products.length;
    fireEvent.change(screen.getByLabelText('Buscar por nombre'), {
      target: { value: 'inexistente' },
    });
    expect(
      screen.getByText(`0 de ${total} productos · Filtros aplicados`),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Mostrar todos los productos'));
    expect(screen.getByText('Espresso')).toBeTruthy();
    expect(screen.getByText(`${total} de ${total} productos`)).toBeTruthy();
    expect(
      (screen.getByLabelText('Buscar por nombre') as HTMLInputElement).value,
    ).toBe('');
    auth.dispose();
  });
  it('conserva el borrador ante conflicto, protege la salida y guarda sobre la versión actual', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    fireEvent.click(screen.getByLabelText('Editar Espresso'));
    await screen.findByRole('dialog', {}, { timeout: 3000 });
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Espresso propio' },
    });
    fireEvent.change(screen.getByLabelText('Precio (BOB)'), {
      target: { value: '17,5' },
    });
    menuClient.setScenario('conflict');
    fireEvent.click(screen.getByText('Guardar producto'));
    await screen.findByText('El producto cambió en otra sesión');
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe(
      'Espresso propio',
    );
    expect(
      (screen.getByLabelText('Precio (BOB)') as HTMLInputElement).value,
    ).toBe('17,5');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeTruthy();
    fireEvent.click(screen.getByText('Guardar mis cambios'));
    await screen.findByText('Espresso propio');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('BOB 17.5')).toBeTruthy();
    auth.dispose();
  });
  it('permite elegir la versión actual tras un conflicto sin perderla silenciosamente', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    fireEvent.click(screen.getByLabelText('Editar Espresso'));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Cambio local' },
    });
    menuClient.setScenario('conflict');
    fireEvent.click(screen.getByText('Guardar producto'));
    await screen.findByText('El producto cambió en otra sesión');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByText('Usar versión actual'));
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe(
      'Cambio local',
    );
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByText('Usar versión actual'));
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe(
      'Espresso',
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByRole('dialog')).toBeNull();
    auth.dispose();
  });
  it('adopta los cambios remotos de campos intactos sin perder la edición local', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    const original = (await menuClient.list()).products.find(
      (product) => product.name === 'Espresso',
    )!;
    fireEvent.click(screen.getByLabelText('Editar Espresso'));
    await screen.findByRole('dialog');
    fireEvent.change(screen.getByLabelText('Nombre'), {
      target: { value: 'Nombre local' },
    });
    vi.spyOn(menuClient, 'saveProduct').mockRejectedValueOnce(
      new MenuError('CONFLICT', 'Cambió en otra sesión'),
    );
    vi.spyOn(menuClient, 'getProduct').mockResolvedValueOnce({
      ...original,
      version: original.version + 1,
      description: 'Descripción remota',
      priceTenths: 145,
      image: 'blob:imagen-remota',
    });
    fireEvent.click(screen.getByText('Guardar producto'));
    await screen.findByText('El producto cambió en otra sesión');
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe(
      'Nombre local',
    );
    expect(
      (screen.getByLabelText('Descripción') as HTMLTextAreaElement).value,
    ).toBe('Descripción remota');
    expect(
      (screen.getByLabelText('Precio (BOB)') as HTMLInputElement).value,
    ).toBe('14.5');
    expect(
      screen.getByAltText('Vista previa del producto').getAttribute('src'),
    ).toBe('blob:imagen-remota');
    auth.dispose();
  });
  it('no invierte un cambio que sí se guardó cuando se perdió su confirmación', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    const setActive = menuClient.setActive.bind(menuClient);
    const activate = vi
      .spyOn(menuClient, 'setActive')
      .mockImplementationOnce(async (product) => {
        await setActive(product);
        throw new MenuError('CONNECTION_ERROR', 'Se perdió la respuesta');
      });
    fireEvent.click(screen.getByLabelText('Desactivar Espresso'));
    fireEvent.click(
      await screen.findByText('Reintentar cambio de estado de Espresso'),
    );
    await screen.findByLabelText('Reactivar Espresso');
    expect(activate).toHaveBeenCalledTimes(1);
    auth.dispose();
  });
  it('reintenta abrir el producto en lugar de limitarse a recargar el catálogo', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    const get = vi
      .spyOn(menuClient, 'getProduct')
      .mockRejectedValueOnce(new Error('Sin conexión al abrir'));
    fireEvent.click(screen.getByLabelText('Editar Espresso'));
    fireEvent.click(await screen.findByText('Reintentar abrir Espresso'));
    await screen.findByRole('dialog');
    expect(get).toHaveBeenCalledTimes(2);
    auth.dispose();
  });
  it('reintenta el estado deseado y permite deshacer aunque la fila salga del filtro', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    fireEvent.change(screen.getByLabelText('Estado'), {
      target: { value: 'active' },
    });
    const activate = vi
      .spyOn(menuClient, 'setActive')
      .mockRejectedValueOnce(
        new MenuError('CONNECTION_ERROR', 'No se guardó el estado'),
      );
    fireEvent.click(screen.getByLabelText('Desactivar Espresso'));
    fireEvent.click(
      await screen.findByText('Reintentar cambio de estado de Espresso'),
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('Desactivar Espresso')).toBeNull(),
    );
    const undo = await screen.findByText('Deshacer cambio de Espresso');
    await waitFor(() =>
      expect((undo as HTMLButtonElement).disabled).toBe(false),
    );
    fireEvent.click(undo);
    await screen.findByLabelText('Desactivar Espresso');
    expect(activate).toHaveBeenCalledTimes(3);
    auth.dispose();
  });
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
  it('CA-09 busca con NFC sin añadir equivalencia de acentos', async () => {
    const auth = mount();
    await screen.findByText('Café con leche');
    const search = screen.getByLabelText('Buscar por nombre');
    // "Cafe" + U+0301 combining acute is the decomposed form of "Café".
    fireEvent.change(search, { target: { value: '  CAFÉ ' } });
    expect(screen.getByText('Café con leche')).toBeTruthy();
    expect(screen.queryByText('Espresso')).toBeNull();
    fireEvent.change(search, { target: { value: 'cafe con' } });
    expect(
      screen.getByText('Ningún producto coincide con los filtros'),
    ).toBeTruthy();
    auth.dispose();
  });
  it('no muestra el panel de datos simulados', async () => {
    const auth = mount();
    await screen.findByText('Espresso');
    expect(screen.queryByText(/Datos simulados/)).toBeNull();
    expect(screen.queryByText('Simular sesión finalizada')).toBeNull();
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
