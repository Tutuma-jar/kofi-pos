import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { ProductForm } from './ProductForm';
import { CatalogFilters } from './CatalogFilters';
import { MenuState } from './MenuState';
import { ProductList } from './ProductList';
import { ProductImageField } from './ProductImageField';
import { catalogFixture } from '../api/fixtures';
afterEach(cleanup);
describe('Interfaz de menú', () => {
  it('rechaza contenido SVG aunque declare JPEG, y permite quitar imagen', async () => {
    const change = vi.fn();
    render(
      <ProductImageField
        value="data:image/png;base64,demo"
        onChange={change}
        onBusy={vi.fn()}
      />,
    );
    const file = new File(['<svg/>'], 'falso.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'arrayBuffer', {
      value: async () => new TextEncoder().encode('<svg/>').buffer,
    });
    fireEvent.change(screen.getByLabelText('Imagen opcional'), {
      target: { files: [file] },
    });
    await screen.findByText('Usa JPEG, PNG o WebP sin animación.');
    expect(change).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Quitar imagen'));
    expect(change).toHaveBeenCalledWith(null);
  });
  it('validaciones accesibles enfocan el primer campo inválido', async () => {
    render(
      <ProductForm
        categories={catalogFixture.categories}
        onDraft={vi.fn()}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
        onCategories={vi.fn()}
        onConflict={vi.fn()}
        onDirty={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText('Guardar producto'));
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText('Nombre')),
    );
    expect(screen.getByLabelText('Nombre').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(screen.getByText('Selecciona una categoría.')).toBeTruthy();
  });
  it('filtros tienen etiquetas y publican selección', () => {
    const change = vi.fn();
    render(
      <CatalogFilters
        categories={catalogFixture.categories}
        filters={{ search: '', category: '', state: '' }}
        onChange={change}
      />,
    );
    fireEvent.change(screen.getByLabelText('Buscar por nombre'), {
      target: { value: 'Café' },
    });
    expect(change).toHaveBeenCalledWith({
      search: 'Café',
      category: '',
      state: '',
    });
  });
  it.each([
    'Aún no hay productos. Agrega el primero para empezar a vender.',
    'Crea una categoría antes de agregar productos',
    'Ningún producto coincide con los filtros',
  ])('muestra mensaje exacto: %s', (message) => {
    render(<MenuState message={message} />);
    expect(screen.getByRole('status').textContent).toBe(message);
  });
  it('muestra estado, moneda y acciones sin borrado', () => {
    render(
      <ProductList
        {...catalogFixture}
        pending={[]}
        edit={vi.fn()}
        toggle={vi.fn()}
      />,
    );
    expect(screen.getByText('Inactivo')).toBeTruthy();
    expect(screen.getByText('BOB 10.0')).toBeTruthy();
    expect(screen.queryByText('Eliminar')).toBeNull();
  });
  it('error ofrece reintento', () => {
    const retry = vi.fn();
    render(<MenuState message="Error de conexión" retry={retry} />);
    fireEvent.click(screen.getByText('Reintentar'));
    expect(retry).toHaveBeenCalledOnce();
  });
});
