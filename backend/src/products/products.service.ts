import { ObjectId, type ClientSession, type Db } from 'mongodb';
import {
  releaseCategoryReference,
  reserveCategoryReference,
} from '../categories/categories.references.js';
import { ApiError } from '../shared/http/api-error.js';
import {
  catalogNameKey,
  isDuplicateNameKey,
} from '../shared/text/catalog-text.js';
import type { ImageStore } from './image-store.js';
import { checkImage } from './product-images.js';
import {
  productDto,
  productImagesCollection,
  productsCollection,
  type Product,
  type ProductImage,
} from './products.model.js';
import type {
  CreateProductInput,
  ProductActivationInput,
  UpdateProductInput,
} from './products.schemas.js';

export const ORPHAN_IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
// US-007, shared rule of concurrency. Diagnostic for the API; the UI shows
// its own copy of the same text.
export const PRODUCT_VERSION_CONFLICT_MESSAGE =
  'Este producto cambió mientras lo editabas. Revisa la versión actual y vuelve a aplicar tus cambios.';
const collator = new Intl.Collator('es');

const notFound = () => new ApiError('NOT_FOUND', 'Recurso no encontrado.');

// Internal signal: aborts the transaction, then becomes VERSION_CONFLICT.
class StaleProductVersion extends Error {}

export type ProductChanges = Partial<
  Pick<
    Product,
    | 'name'
    | 'nameKey'
    | 'description'
    | 'priceTenths'
    | 'categoryId'
    | 'imageId'
    | 'active'
  >
> & { updatedAt: Date };

/**
 * Shared optimistic control of a product (edition TASK-018, activation
 * TASK-022). Call only inside the caller's `session.withTransaction`. Applies
 * the changes only to the expected version and increments it, so the first
 * valid save of a version wins and any later one on that version is rejected
 * without overwriting it. Filters by identity only: no global lock. Returns
 * the document before the change, so the caller can adjust references.
 */
export async function updateVersioned(
  db: Db,
  session: ClientSession,
  id: ObjectId,
  expectedVersion: number,
  changes: ProductChanges,
): Promise<Product> {
  const products = productsCollection(db);
  const before = await products.findOneAndUpdate(
    { _id: id, version: expectedVersion },
    { $set: changes, $inc: { version: 1 } },
    { session, returnDocument: 'before' },
  );
  if (before) return before;
  const exists = await products.findOne(
    { _id: id },
    { session, projection: { _id: 1 } },
  );
  if (!exists) throw notFound();
  throw new StaleProductVersion();
}

const sameId = (left: ObjectId | null, right: ObjectId | null) =>
  left === null || right === null ? left === right : left.equals(right);

export function createProductsService(
  db: Db,
  images: ImageStore,
  clock: () => Date = () => new Date(),
) {
  const products = productsCollection(db);
  const productImages = productImagesCollection(db);

  /**
   * Shared answer to a stale save (edition and activation): 409 with the
   * current version, read after the aborted transaction; 404 if it vanished.
   */
  async function versionConflict(productId: ObjectId): Promise<ApiError> {
    const current = await products.findOne({ _id: productId });
    if (!current) return notFound();
    return new ApiError('VERSION_CONFLICT', PRODUCT_VERSION_CONFLICT_MESSAGE, {
      current: productDto(current),
    });
  }

  /**
   * Removes images uploaded but never associated for more than 24 h. The
   * conditional delete competes with the association, which only claims an
   * image still unassociated: an image is either claimed or deleted.
   * With `scanFiles`, also removes old files without metadata (interrupted
   * uploads), only by the generated naming scheme.
   */
  async function cleanupOrphanImages(options: { scanFiles?: boolean } = {}) {
    const cutoff = new Date(clock().getTime() - ORPHAN_IMAGE_TTL_MS);
    const stale = await productImages
      .find(
        { productId: null, createdAt: { $lt: cutoff } },
        { projection: { _id: 1 } },
      )
      .limit(100)
      .toArray();
    for (const { _id } of stale) {
      const removed = await productImages.deleteOne({
        _id,
        productId: null,
        createdAt: { $lt: cutoff },
      });
      if (removed.deletedCount === 1) await images.remove(_id);
    }
    if (!options.scanFiles) return;
    for (const file of await images.list()) {
      if (file.modifiedAt >= cutoff) continue;
      if (
        file.id === null ||
        !(await productImages.findOne(
          { _id: new ObjectId(file.id) },
          { projection: { _id: 1 } },
        ))
      )
        await images.removeName(file.name);
    }
  }

  return {
    cleanupOrphanImages,

    async uploadImage(bytes: Uint8Array) {
      const checked = checkImage(bytes);
      if (!checked.ok)
        throw new ApiError('VALIDATION_ERROR', 'Imagen no admitida.', {
          fields: [{ field: 'image', code: checked.code }],
        });
      const image: ProductImage = {
        _id: new ObjectId(),
        format: checked.format,
        byteLength: bytes.length,
        width: checked.width,
        height: checked.height,
        productId: null,
        createdAt: clock(),
      };
      await images.write(image._id, bytes);
      try {
        await productImages.insertOne(image);
      } catch (error) {
        await images.remove(image._id);
        throw error;
      }
      // Opportunistic: a cleanup failure never invalidates a stored upload.
      try {
        await cleanupOrphanImages();
      } catch (error) {
        console.error(
          'No se pudieron limpiar imágenes huérfanas:',
          error instanceof Error ? error.message : error,
        );
      }
      return {
        id: image._id.toHexString(),
        width: image.width,
        height: image.height,
      };
    },

    /**
     * Category reference, image claim and product insert share a single
     * transaction. Reserving writes the category document, so a concurrent
     * deletion and this assignment compete for it; the unique `nameKey` index
     * alone decides duplicates, also under concurrent creation.
     */
    async create(input: CreateProductInput) {
      const now = clock();
      const product: Product = {
        _id: new ObjectId(),
        name: input.name,
        nameKey: catalogNameKey(input.name),
        description: input.description,
        priceTenths: input.priceTenths,
        categoryId: new ObjectId(input.categoryId),
        imageId: input.imageId === null ? null : new ObjectId(input.imageId),
        active: true,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      const session = db.client.startSession();
      try {
        await session.withTransaction(async () => {
          await reserveCategoryReference(db, session, product.categoryId);
          if (product.imageId) {
            const claimed = await productImages.updateOne(
              { _id: product.imageId, productId: null },
              { $set: { productId: product._id } },
              { session },
            );
            if (claimed.matchedCount === 0)
              throw new ApiError('VALIDATION_ERROR', 'Imagen no disponible.', {
                fields: [{ field: 'imageId', code: 'NOT_ALLOWED' }],
              });
          }
          await products.insertOne(product, { session });
        });
      } catch (error) {
        if (isDuplicateNameKey(error))
          throw new ApiError('DUPLICATE_NAME', 'Nombre de producto duplicado.');
        throw error;
      } finally {
        await session.endSession();
      }
      return productDto(product);
    },

    // Active first, then Spanish alphabetical order; id breaks ties.
    async list() {
      const items = await products.find({}).toArray();
      items.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        const byName = collator.compare(a.name, b.name);
        if (byName !== 0) return byName;
        const left = a._id.toHexString();
        const right = b._id.toHexString();
        return left < right ? -1 : left > right ? 1 : 0;
      });
      return { items: items.map(productDto) };
    },

    async get(id: string) {
      const product = await products.findOne({ _id: new ObjectId(id) });
      if (!product) throw notFound();
      return productDto(product);
    },

    /**
     * Edition (US-007). The versioned write, the category reference change
     * and the image claim share one transaction, so any rejection (stale
     * version, duplicate name, missing category, unavailable image) leaves
     * the product, counters and images untouched. The unique `nameKey` index
     * alone decides duplicates; keeping the own name matches the same
     * document. The replaced image file is removed after the commit.
     */
    async update(id: string, input: UpdateProductInput) {
      const productId = new ObjectId(id);
      const { version, ...fields } = input;
      const changes: ProductChanges = { updatedAt: clock() };
      if (fields.name !== undefined) {
        changes.name = fields.name;
        changes.nameKey = catalogNameKey(fields.name);
      }
      if (fields.description !== undefined)
        changes.description = fields.description;
      if (fields.priceTenths !== undefined)
        changes.priceTenths = fields.priceTenths;
      const nextCategory =
        fields.categoryId === undefined
          ? undefined
          : new ObjectId(fields.categoryId);
      if (nextCategory) changes.categoryId = nextCategory;
      const nextImage =
        fields.imageId === undefined
          ? undefined
          : fields.imageId === null
            ? null
            : new ObjectId(fields.imageId);
      if (nextImage !== undefined) changes.imageId = nextImage;

      const outcome: { product?: Product; releasedImage?: ObjectId } = {};
      const session = db.client.startSession();
      try {
        await session.withTransaction(async () => {
          // The callback may be retried: never keep state of a failed attempt.
          delete outcome.product;
          delete outcome.releasedImage;
          const before = await updateVersioned(
            db,
            session,
            productId,
            version,
            changes,
          );
          if (nextCategory && !nextCategory.equals(before.categoryId)) {
            await releaseCategoryReference(db, session, before.categoryId);
            await reserveCategoryReference(db, session, nextCategory);
          }
          if (nextImage !== undefined && !sameId(nextImage, before.imageId)) {
            if (nextImage) {
              const claimed = await productImages.updateOne(
                { _id: nextImage, productId: null },
                { $set: { productId } },
                { session },
              );
              if (claimed.matchedCount === 0)
                throw new ApiError(
                  'VALIDATION_ERROR',
                  'Imagen no disponible.',
                  { fields: [{ field: 'imageId', code: 'NOT_ALLOWED' }] },
                );
            }
            if (before.imageId) {
              await productImages.deleteOne(
                { _id: before.imageId, productId },
                { session },
              );
              outcome.releasedImage = before.imageId;
            }
          }
          outcome.product = {
            ...before,
            ...changes,
            version: before.version + 1,
          };
        });
      } catch (error) {
        if (isDuplicateNameKey(error))
          throw new ApiError('DUPLICATE_NAME', 'Nombre de producto duplicado.');
        if (error instanceof StaleProductVersion)
          throw await versionConflict(productId);
        throw error;
      } finally {
        await session.endSession();
      }
      if (!outcome.product)
        throw new ApiError(
          'INTERNAL_ERROR',
          'No se pudo completar la solicitud.',
        );
      // Best effort: a leftover file without metadata is removed by the
      // startup cleanup; it is never readable once its metadata is gone.
      if (outcome.releasedImage) {
        try {
          await images.remove(outcome.releasedImage);
        } catch (error) {
          console.error(
            'No se pudo eliminar la imagen reemplazada:',
            error instanceof Error ? error.message : error,
          );
        }
      }
      return productDto(outcome.product);
    },

    /**
     * Activation (US-009). Changes only `active` (plus `version` and
     * `updatedAt`) through the version shared with edition, so a stale
     * activation or edition never overwrites the other. Category counters and
     * images are untouched: an inactive product keeps its category reference.
     * Asking for the current state on the current version is a no-op that
     * keeps `version` and `updatedAt`.
     */
    async setActive(id: string, input: ProductActivationInput) {
      const productId = new ObjectId(id);
      const outcome: { product?: Product } = {};
      const session = db.client.startSession();
      try {
        await session.withTransaction(async () => {
          // The callback may be retried: never keep state of a failed attempt.
          delete outcome.product;
          const current = await products.findOne(
            { _id: productId, version: input.version },
            { session },
          );
          if (current && current.active === input.active) {
            outcome.product = current;
            return;
          }
          const changes: ProductChanges = {
            active: input.active,
            updatedAt: clock(),
          };
          const before = await updateVersioned(
            db,
            session,
            productId,
            input.version,
            changes,
          );
          outcome.product = {
            ...before,
            ...changes,
            version: before.version + 1,
          };
        });
      } catch (error) {
        if (error instanceof StaleProductVersion)
          throw await versionConflict(productId);
        throw error;
      } finally {
        await session.endSession();
      }
      if (!outcome.product)
        throw new ApiError(
          'INTERNAL_ERROR',
          'No se pudo completar la solicitud.',
        );
      return productDto(outcome.product);
    },

    // Only images associated with a product are readable.
    async readImage(id: string) {
      const image = await productImages.findOne({
        _id: new ObjectId(id),
        productId: { $ne: null },
      });
      if (!image) throw notFound();
      return { format: image.format, bytes: await images.read(image._id) };
    },
  };
}
