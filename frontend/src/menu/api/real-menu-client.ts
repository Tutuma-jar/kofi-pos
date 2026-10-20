import type { HttpResult } from '../../auth/api/contract.provisional';
import { MenuError } from './contract.provisional';
import type {
  Category,
  Fields,
  MenuClient,
  Product,
} from './contract.provisional';

/** Menu administration over the common authorized client of auth/api.
 * TASK-020: categories (creation and reading). TASK-016: product creation,
 * administrative reading and local images. TASK-018: product edition with
 * optimistic version control. TASK-022: product activation with the same
 * version. Renaming/deleting categories (TASK-020) are not available yet and
 * fail explicitly, without requests.
 */
export const menuMessages = {
  duplicate: 'Ya existe una categoría con este nombre.',
  length: 'Escribe un nombre de 1 a 80 caracteres.',
  conflict:
    'Esta categoría cambió mientras la editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
  session: 'Tu sesión terminó. Inicia sesión de nuevo.',
  connection: 'No pudimos completar la operación. Reintenta.',
  unavailable: 'Esta acción aún no está disponible.',
} as const;

export const productMessages = {
  duplicate: 'Ya existe un producto con este nombre.',
  name: 'Escribe un nombre de 1 a 100 caracteres.',
  description: 'Escribe una descripción de 1 a 1.000 caracteres.',
  price: 'Usa un precio mayor que cero, con máximo un decimal.',
  category: 'Selecciona una categoría existente.',
  fields: 'Revisa los campos indicados.',
  imageFailed: 'No se cargó la imagen. El producto no cambió. Reintenta.',
  imageRejected:
    'La imagen no cumple los requisitos: JPEG, PNG o WebP sin animación, hasta 5 MB y 4.096 px por lado. El producto no cambió.',
  missing: 'El producto ya no está disponible. Actualiza la lista.',
  conflict:
    'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.',
} as const;

export type MenuTransport = {
  request?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<HttpResult<unknown>>;
  // Authorized raw response: images need the tab headers, so <img src> cannot
  // read them directly.
  openStream?: (
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<HttpResult<Response>>;
};
export type ObjectUrls = {
  create: (blob: Blob) => string;
  revoke: (url: string) => void;
};
type Failure = Exclude<HttpResult<unknown>, { kind: 'ok' }>;

/** Product as answered by the API (US-006 contract approved for TASK-016). */
export type ProductDto = Omit<Product, 'image'> & { imageId: string | null };

const objectId = /^[a-f0-9]{24}$/;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const positiveSafeInteger = (value: unknown) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1;
const text = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

export function validCategory(value: unknown): value is Category {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    objectId.test(value.id) &&
    text(value.name) &&
    positiveSafeInteger(value.version)
  );
}
export function validCategoryList(
  value: unknown,
): value is { items: Category[] } {
  if (!record(value) || !Array.isArray(value.items)) return false;
  const ids = new Set<string>();
  for (const item of value.items) {
    if (!validCategory(item) || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}
export function validProduct(value: unknown): value is ProductDto {
  return (
    record(value) &&
    typeof value.id === 'string' &&
    objectId.test(value.id) &&
    positiveSafeInteger(value.version) &&
    text(value.name) &&
    text(value.description) &&
    positiveSafeInteger(value.priceTenths) &&
    typeof value.categoryId === 'string' &&
    objectId.test(value.categoryId) &&
    (value.imageId === null ||
      (typeof value.imageId === 'string' && objectId.test(value.imageId))) &&
    typeof value.active === 'boolean'
  );
}
export function validProductList(
  value: unknown,
): value is { items: ProductDto[] } {
  if (!record(value) || !Array.isArray(value.items)) return false;
  const ids = new Set<string>();
  for (const item of value.items) {
    if (!validProduct(item) || ids.has(item.id)) return false;
    ids.add(item.id);
  }
  return true;
}
const nameLengthRejected = (details: unknown) =>
  record(details) &&
  Array.isArray(details.fields) &&
  details.fields.some(
    (field: unknown) =>
      record(field) &&
      field.field === 'name' &&
      (field.code === 'TOO_SHORT' || field.code === 'TOO_LONG'),
  );

const connectionError = () =>
  new MenuError('CONNECTION_ERROR', menuMessages.connection);
const sessionError = () =>
  new MenuError('CONNECTION_ERROR', menuMessages.session);

// The server message is diagnostic only: the UI shows these texts.
export function menuFailure(result: Failure): MenuError {
  if (result.kind === 'unauthorized') return sessionError();
  if (result.kind === 'error') {
    if (result.status === 409 && result.code === 'DUPLICATE_NAME')
      return new MenuError('VALIDATION_ERROR', menuMessages.duplicate, {
        name: menuMessages.duplicate,
      });
    if (result.status === 409 && result.code === 'VERSION_CONFLICT')
      return new MenuError('CONFLICT', menuMessages.conflict);
    if (
      result.status === 400 &&
      result.code === 'VALIDATION_ERROR' &&
      nameLengthRejected(result.details)
    )
      return new MenuError('VALIDATION_ERROR', menuMessages.length, {
        name: menuMessages.length,
      });
  }
  // Network, 5xx, superseded or unexpected answers: never an empty catalog.
  return connectionError();
}

// API field -> [form field of the UI, message].
const productFields = new Map<string, [string, string]>([
  ['name', ['name', productMessages.name]],
  ['description', ['description', productMessages.description]],
  ['priceTenths', ['price', productMessages.price]],
  ['categoryId', ['categoryId', productMessages.category]],
]);

// Product creation and edition rejections, keyed by the form fields of the UI.
export function productFailure(result: Failure): MenuError {
  if (result.kind === 'unauthorized') return sessionError();
  if (result.kind !== 'error') return connectionError();
  // The UI reloads the current version and discards the unsaved changes.
  if (result.status === 409 && result.code === 'VERSION_CONFLICT')
    return new MenuError('CONFLICT', productMessages.conflict);
  if (result.status === 404)
    return new MenuError('CONNECTION_ERROR', productMessages.missing);
  if (result.status === 409 && result.code === 'DUPLICATE_NAME')
    return new MenuError('VALIDATION_ERROR', productMessages.duplicate, {
      name: productMessages.duplicate,
    });
  const details = result.details;
  if (
    result.status !== 400 ||
    result.code !== 'VALIDATION_ERROR' ||
    !record(details) ||
    !Array.isArray(details.fields) ||
    details.fields.length === 0
  )
    return connectionError();
  const fields: Fields = {};
  let image = false;
  for (const field of details.fields as unknown[]) {
    if (!record(field) || typeof field.field !== 'string')
      return connectionError();
    if (field.field === 'imageId') {
      image = true;
      continue;
    }
    const known = productFields.get(field.field);
    if (!known) return connectionError();
    fields[known[0]] = known[1];
  }
  if (Object.keys(fields).length)
    return new MenuError('VALIDATION_ERROR', productMessages.fields, fields);
  // The uploaded image expired or was taken: upload again.
  return image
    ? new MenuError('IMAGE_ERROR', productMessages.imageFailed)
    : connectionError();
}

export function imageFailure(result: Failure): MenuError {
  if (result.kind === 'unauthorized') return sessionError();
  if (
    result.kind === 'error' &&
    ((result.status === 400 && result.code === 'VALIDATION_ERROR') ||
      (result.status === 413 && result.code === 'PAYLOAD_TOO_LARGE'))
  )
    return new MenuError('IMAGE_ERROR', productMessages.imageRejected);
  return new MenuError('IMAGE_ERROR', productMessages.imageFailed);
}

function readFailure(result: Failure): MenuError {
  if (result.kind === 'error' && result.status === 404)
    return new MenuError('CONNECTION_ERROR', productMessages.missing);
  return menuFailure(result);
}

// Bytes of the local data URL prepared by the form; never re-encoded.
export function dataUrlBytes(value: string): Uint8Array<ArrayBuffer> | null {
  const match = /^data:[^,]*;base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
  if (!match) return null;
  try {
    const binary = atob(match[1] ?? '');
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++)
      bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

const unavailable = () =>
  Promise.reject(new MenuError('CONNECTION_ERROR', menuMessages.unavailable));

export function createRealMenuClient(
  auth: MenuTransport,
  timeoutMs = 15_000,
  options: { uploadTimeoutMs?: number; objectUrls?: ObjectUrls } = {},
): MenuClient {
  const uploadTimeoutMs = options.uploadTimeoutMs ?? 60_000;
  const objectUrls: ObjectUrls = options.objectUrls ?? {
    create: (blob) => URL.createObjectURL(blob),
    revoke: (url) => URL.revokeObjectURL(url),
  };
  // Image ids are immutable: one object URL per id while it is listed.
  const imageCache = new Map<string, Promise<string>>();

  async function send(
    path: string,
    init: RequestInit = {},
    failure: (result: Failure) => MenuError = menuFailure,
    limitMs = timeoutMs,
  ) {
    if (!auth.request) throw failure({ kind: 'connection' });
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), limitMs);
    let result: HttpResult<unknown>;
    try {
      result = await auth.request(path, { ...init, signal: abort.signal });
    } catch {
      result = { kind: 'connection' };
    } finally {
      clearTimeout(timeout);
    }
    if (result.kind !== 'ok') throw failure(result);
    return result.data;
  }

  async function fetchImage(id: string): Promise<string> {
    if (!auth.openStream) throw connectionError();
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), timeoutMs);
    try {
      let result: HttpResult<Response>;
      try {
        result = await auth.openStream(`/api/product-images/${id}`, {
          signal: abort.signal,
        });
      } catch {
        result = { kind: 'connection' };
      }
      if (result.kind !== 'ok') throw menuFailure(result);
      let blob: Blob;
      try {
        blob = await result.data.blob();
      } catch {
        throw connectionError();
      }
      if (!imageTypes.includes(blob.type)) throw connectionError();
      return objectUrls.create(blob);
    } finally {
      clearTimeout(timeout);
    }
  }
  function imageUrl(id: string) {
    let cached = imageCache.get(id);
    if (!cached) {
      cached = fetchImage(id);
      imageCache.set(id, cached);
      const pending = cached;
      void pending.catch(() => {
        if (imageCache.get(id) === pending) imageCache.delete(id);
      });
    }
    return cached;
  }
  function releaseImagesExcept(kept: Set<string>) {
    for (const [id, url] of imageCache) {
      if (kept.has(id)) continue;
      imageCache.delete(id);
      void url.then(
        (value) => objectUrls.revoke(value),
        () => undefined,
      );
    }
  }
  // A failed image read fails the whole read: never shown as "no image".
  async function toProduct(dto: ProductDto): Promise<Product> {
    return {
      id: dto.id,
      version: dto.version,
      name: dto.name,
      description: dto.description,
      priceTenths: dto.priceTenths,
      categoryId: dto.categoryId,
      image: dto.imageId === null ? null : await imageUrl(dto.imageId),
      active: dto.active,
    };
  }
  async function uploadImage(image: string): Promise<string> {
    const bytes = dataUrlBytes(image);
    if (!bytes || bytes.length === 0)
      throw new MenuError('IMAGE_ERROR', productMessages.imageFailed);
    const data = await send(
      '/api/product-images',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: bytes,
      },
      imageFailure,
      uploadTimeoutMs,
    );
    if (!record(data) || typeof data.id !== 'string' || !objectId.test(data.id))
      throw new MenuError('IMAGE_ERROR', productMessages.imageFailed);
    return data.id;
  }

  return {
    async list() {
      // Products first: a product read later than its category could miss a
      // category created meanwhile; the reverse cannot happen.
      const products = await send('/api/products');
      if (!validProductList(products)) throw connectionError();
      const categories = await send('/api/categories');
      if (!validCategoryList(categories)) throw connectionError();
      const known = new Set(categories.items.map((item) => item.id));
      if (products.items.some((item) => !known.has(item.categoryId)))
        throw connectionError();
      const items = await Promise.all(products.items.map(toProduct));
      releaseImagesExcept(
        new Set(
          products.items.flatMap((item) =>
            item.imageId === null ? [] : [item.imageId],
          ),
        ),
      );
      return { categories: categories.items, products: items };
    },
    async getProduct(id) {
      if (!objectId.test(id))
        throw new MenuError('CONNECTION_ERROR', productMessages.missing);
      const data = await send(`/api/products/${id}`, {}, readFailure);
      if (!validProduct(data)) throw connectionError();
      return toProduct(data);
    },
    async saveProduct(input, current) {
      // Edition keeps an unchanged image (the object URL read) by omitting
      // imageId; null removes it and a new data URL is uploaded first.
      const imageId =
        input.image === null
          ? null
          : current && input.image === current.image
            ? undefined
            : await uploadImage(input.image);
      const fields = {
        name: input.name,
        description: input.description,
        priceTenths: input.priceTenths,
        categoryId: input.categoryId,
      };
      const data = await send(
        current ? `/api/products/${current.id}` : '/api/products',
        {
          method: current ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            current
              ? {
                  version: current.version,
                  ...fields,
                  ...(imageId !== undefined && { imageId }),
                }
              : { ...fields, imageId },
          ),
        },
        productFailure,
      );
      // Only a valid body of the same product is a success; anything else is
      // not saved here.
      if (
        !validProduct(data) ||
        (current && data.id !== current.id) ||
        (imageId !== undefined && data.imageId !== imageId)
      )
        throw connectionError();
      return {
        id: data.id,
        version: data.version,
        name: data.name,
        description: data.description,
        priceTenths: data.priceTenths,
        categoryId: data.categoryId,
        image: imageId === undefined ? current!.image : input.image,
        active: data.active,
      };
    },
    async saveCategory(name, current) {
      if (current) return unavailable();
      const data = await send('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!validCategory(data)) throw connectionError();
    },
    deleteCategory: unavailable,
    async setActive(product) {
      if (!objectId.test(product.id))
        throw new MenuError('CONNECTION_ERROR', productMessages.missing);
      const active = !product.active;
      const data = await send(
        `/api/products/${product.id}/activation`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version: product.version, active }),
        },
        productFailure,
      );
      // Only the same product in the requested state is a success.
      if (
        !validProduct(data) ||
        data.id !== product.id ||
        data.active !== active
      )
        throw connectionError();
    },
    // Compatibility surface for the simulated UI: no fixture fallback.
    setScenario() {},
  };
}
