import { catalogFixture } from './fixtures';
import { MenuError } from './contract.provisional';
import type {
  Category,
  MenuClient,
  Product,
  ProductInput,
  Scenario,
} from './contract.provisional';
export const visibleLength = (text: string) =>
  Array.from(
    new Intl.Segmenter('es', { granularity: 'grapheme' }).segment(text.trim()),
  ).length;
const key = (name: string) => name.trim().toLowerCase();
export function validateProduct(input: ProductInput) {
  const fields: Record<string, string> = {};
  if (visibleLength(input.name) < 1 || visibleLength(input.name) > 100)
    fields.name = 'Escribe un nombre de 1 a 100 caracteres.';
  if (
    visibleLength(input.description) < 1 ||
    visibleLength(input.description) > 1000
  )
    fields.description = 'Escribe una descripción de 1 a 1.000 caracteres.';
  if (!Number.isSafeInteger(input.priceTenths) || input.priceTenths <= 0)
    fields.price = 'Usa un precio mayor que cero, con máximo un decimal.';
  if (!input.categoryId) fields.categoryId = 'Selecciona una categoría.';
  return fields;
}
export function createDemoClient(delay = 350): MenuClient {
  let data = structuredClone(catalogFixture);
  let scenario: Scenario = 'normal';
  let sequence = 0;
  const wait = async (write = false) => {
    await new Promise((resolve) =>
      setTimeout(resolve, scenario === 'slow' ? 2200 : delay),
    );
    if (scenario === 'connection' || (write && scenario === 'save-error'))
      throw new MenuError(
        'CONNECTION_ERROR',
        'No pudimos completar la operación. Reintenta.',
      );
  };
  const productConflict = (product: Product) => {
    if (scenario === 'conflict') {
      product.version++;
      scenario = 'normal';
    }
  };
  const categoryConflict = (category: Category, version: number) => {
    if (scenario === 'conflict') {
      category.version++;
      scenario = 'normal';
    }
    if (category.version !== version)
      throw new MenuError(
        'CONFLICT',
        'Esta categoría cambió mientras la editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
      );
  };
  return {
    setScenario(value) {
      scenario = value;
      if (value === 'empty' || value === 'no-categories') {
        data = {
          products: [],
          categories:
            value === 'empty' ? structuredClone(catalogFixture.categories) : [],
        };
      } else if (value === 'normal') data = structuredClone(catalogFixture);
    },
    async list() {
      await wait();
      return structuredClone(data);
    },
    async getProduct(id) {
      await wait();
      const product = data.products.find((item) => item.id === id);
      if (!product)
        throw new MenuError(
          'CONNECTION_ERROR',
          'El producto ya no está disponible. Actualiza la lista.',
        );
      return structuredClone(product);
    },
    async saveProduct(input, current) {
      await wait(true);
      const existing =
        current && data.products.find((item) => item.id === current.id);
      if (existing && current) {
        productConflict(existing);
        if (existing.version !== current.version)
          throw new MenuError(
            'CONFLICT',
            'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
          );
      }
      const fields = validateProduct(input);
      if (
        data.products.some(
          (item) =>
            item.id !== current?.id && key(item.name) === key(input.name),
        )
      )
        fields.name = 'Ya existe un producto con este nombre.';
      if (!data.categories.some((item) => item.id === input.categoryId))
        fields.categoryId = 'Selecciona una categoría existente.';
      if (Object.keys(fields).length)
        throw new MenuError(
          'VALIDATION_ERROR',
          'Revisa los campos indicados.',
          fields,
        );
      if (
        scenario === 'image-error' &&
        input.image !== existing?.image &&
        input.image
      )
        throw new MenuError(
          'IMAGE_ERROR',
          'No se cargó la imagen. El producto no cambió. Reintenta.',
        );
      const product: Product = {
        ...input,
        name: input.name.trim(),
        description: input.description.trim(),
        id: existing?.id ?? `product-${++sequence}`,
        version: (existing?.version ?? 0) + 1,
        active: existing?.active ?? true,
      };
      if (existing) Object.assign(existing, product);
      else data.products.push(product);
      return structuredClone(product);
    },
    async setActive(current) {
      await wait(true);
      const product = data.products.find((item) => item.id === current.id);
      if (!product)
        throw new MenuError('CONNECTION_ERROR', 'Actualiza el catálogo.');
      productConflict(product);
      if (product.version !== current.version)
        throw new MenuError(
          'CONFLICT',
          'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
        );
      product.active = !product.active;
      product.version++;
    },
    async saveCategory(name, current) {
      await wait(true);
      const existing =
        current && data.categories.find((item) => item.id === current.id);
      if (existing && current) categoryConflict(existing, current.version);
      if (visibleLength(name) < 1 || visibleLength(name) > 80)
        throw new MenuError('VALIDATION_ERROR', 'Revisa el nombre.', {
          name: 'Escribe un nombre de 1 a 80 caracteres.',
        });
      if (
        data.categories.some(
          (item) => item.id !== current?.id && key(item.name) === key(name),
        )
      )
        throw new MenuError('VALIDATION_ERROR', 'Revisa el nombre.', {
          name: 'Ya existe una categoría con este nombre.',
        });
      if (existing) {
        existing.name = name.trim();
        existing.version++;
      } else
        data.categories.push({
          id: `category-${++sequence}`,
          version: 1,
          name: name.trim(),
        });
    },
    async deleteCategory(current) {
      await wait(true);
      const category = data.categories.find((item) => item.id === current.id);
      if (!category)
        throw new MenuError('CONNECTION_ERROR', 'Actualiza las categorías.');
      categoryConflict(category, current.version);
      if (data.products.some((item) => item.categoryId === current.id))
        throw new MenuError(
          'CATEGORY_NOT_EMPTY',
          'No puedes eliminar una categoría con productos asociados, incluidos los inactivos.',
        );
      data.categories = data.categories.filter(
        (item) => item.id !== current.id,
      );
    },
  };
}
