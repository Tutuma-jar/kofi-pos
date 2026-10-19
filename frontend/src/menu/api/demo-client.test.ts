import { describe, expect, it } from 'vitest';
import {
  createDemoClient,
  validateProduct,
  visibleLength,
} from './demo-client';
import { formatPrice } from './menu-client';
import type { ProductInput } from './contract.provisional';
const input: ProductInput = {
  name: 'Mocaccino',
  description: 'Café y cacao',
  priceTenths: 205,
  categoryId: 'coffee',
  image: null,
};
describe('Simulación del catálogo US-006–009', () => {
  it('crea activo, edita conservando identidad y rechaza versión obsoleta', async () => {
    const client = createDemoClient(0);
    const product = await client.saveProduct(input);
    expect(product.active).toBe(true);
    const next = await client.saveProduct({ ...input, name: 'Moca' }, product);
    expect(next.id).toBe(product.id);
    await expect(client.saveProduct(input, product)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    expect((await client.getProduct(product.id)).name).toBe('Moca');
  });
  it('valida nombres de activos/inactivos sin equivalencia de acentos', async () => {
    const client = createDemoClient(0);
    await expect(
      client.saveProduct({ ...input, name: ' LIMONADA ' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await client.saveProduct({ ...input, name: 'Limonáda' });
  });
  it('precios y grafemas respetan límites y formato', () => {
    expect(formatPrice(205)).toBe('BOB 20.5');
    expect(formatPrice(100)).toBe('BOB 10.0');
    expect(visibleLength(' n\u0303 ')).toBe(1);
    for (const value of [0, -1, 1.2, NaN, Number.MAX_SAFE_INTEGER + 1])
      expect(
        validateProduct({ ...input, priceTenths: value }).price,
      ).toBeTruthy();
    expect(validateProduct(input)).toEqual({});
    expect(
      validateProduct({
        ...input,
        name: ' '.repeat(10),
        description: 'a'.repeat(1001),
      }),
    ).toHaveProperty('description');
  });
  it('desactiva/reactiva sin perder información y rechaza conflicto edición-activación', async () => {
    const client = createDemoClient(0);
    const p = await client.saveProduct(input);
    await client.setActive(p);
    const current = await client.getProduct(p.id);
    expect(current).toMatchObject({ ...input, active: false, id: p.id });
    await expect(client.saveProduct(input, p)).rejects.toMatchObject({
      code: 'CONFLICT',
    });
    await client.setActive(current);
    expect((await client.getProduct(p.id)).active).toBe(true);
  });
  it('categorías: renombra, unicidad, asociaciones inactivas y eliminación vacía', async () => {
    const client = createDemoClient(0);
    const { categories } = await client.list();
    const coffee = categories[0]!;
    await client.saveCategory('Cafetería', coffee);
    expect((await client.list()).products[0]?.categoryId).toBe(coffee.id);
    await expect(client.saveCategory(' CAFETERÍA ')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
    await expect(
      client.deleteCategory(categories.find((c) => c.id === 'cold')!),
    ).rejects.toMatchObject({ code: 'CATEGORY_NOT_EMPTY' });
    await client.deleteCategory(categories.find((c) => c.id === 'seasonal')!);
    expect((await client.list()).categories).toHaveLength(3);
  });
  it('simula errores sin alterar producto, y permite retirar imagen', async () => {
    const client = createDemoClient(0);
    const p = await client.saveProduct({
      ...input,
      image: 'data:image/png;base64,demo',
    });
    client.setScenario('image-error');
    await expect(
      client.saveProduct({ ...input, name: 'Otro', image: 'new' }, p),
    ).rejects.toMatchObject({ code: 'IMAGE_ERROR' });
    expect(await client.getProduct(p.id)).toEqual(p);
    await client.saveProduct(input, p);
    expect((await client.getProduct(p.id)).image).toBeNull();
    client.setScenario('connection');
    await expect(client.list()).rejects.toMatchObject({
      code: 'CONNECTION_ERROR',
    });
    client.setScenario('normal');
    expect((await client.list()).products.length).toBeGreaterThan(0);
  });
});
