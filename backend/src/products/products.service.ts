import { ObjectId, type Db } from 'mongodb';
import { reserveCategoryReference } from '../categories/categories.references.js';
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
import type { CreateProductInput } from './products.schemas.js';

export const ORPHAN_IMAGE_TTL_MS = 24 * 60 * 60 * 1000;
const collator = new Intl.Collator('es');

const notFound = () => new ApiError('NOT_FOUND', 'Recurso no encontrado.');

export function createProductsService(
  db: Db,
  images: ImageStore,
  clock: () => Date = () => new Date(),
) {
  const products = productsCollection(db);
  const productImages = productImagesCollection(db);

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
