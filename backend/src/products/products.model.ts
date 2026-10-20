import type { Collection, Db, ObjectId } from 'mongodb';

export type ImageFormat = 'jpeg' | 'png' | 'webp';

export interface Product {
  _id: ObjectId;
  name: string;
  // Comparison key (US-006 CA-02), shared with renaming in TASK-018.
  nameKey: string;
  description: string;
  priceTenths: number;
  // Exactly one existing category, counted in its `productCount`.
  categoryId: ObjectId;
  imageId: ObjectId | null;
  active: boolean;
  // Optimistic version shared by edition (TASK-018) and activation (TASK-022).
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductImage {
  _id: ObjectId;
  format: ImageFormat;
  byteLength: number;
  width: number;
  height: number;
  // null while uploaded but not associated; orphans expire after 24 h.
  productId: ObjectId | null;
  createdAt: Date;
}

export function productsCollection(db: Db): Collection<Product> {
  return db.collection<Product>('products');
}
export function productImagesCollection(db: Db): Collection<ProductImage> {
  return db.collection<ProductImage>('productImages');
}

export async function ensureProductIndexes(db: Db): Promise<void> {
  await productsCollection(db).createIndex(
    { nameKey: 1 },
    { unique: true, name: 'products_name_key_unique' },
  );
  await productImagesCollection(db).createIndex(
    { productId: 1, createdAt: 1 },
    { name: 'product_images_orphans' },
  );
}

export function productDto(product: Product) {
  return {
    id: product._id.toHexString(),
    name: product.name,
    description: product.description,
    priceTenths: product.priceTenths,
    categoryId: product.categoryId.toHexString(),
    imageId: product.imageId ? product.imageId.toHexString() : null,
    active: product.active,
    version: product.version,
  };
}
export type ProductDto = ReturnType<typeof productDto>;
