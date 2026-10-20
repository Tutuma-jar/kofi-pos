import type { Collection, Db, ObjectId } from 'mongodb';

export interface Category {
  _id: ObjectId;
  name: string;
  // Comparison key (US-008 CA-02): trimmed, NFC and lower case; accents kept.
  nameKey: string;
  // Technical association counter, inactive products included. Not inventory.
  productCount: number;
  // Own optimistic version; reference changes never increment it.
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export function categoriesCollection(db: Db): Collection<Category> {
  return db.collection<Category>('categories');
}

export async function ensureCategoryIndexes(db: Db): Promise<void> {
  await categoriesCollection(db).createIndex(
    { nameKey: 1 },
    { unique: true, name: 'categories_name_key_unique' },
  );
}

export function categoryDto(category: Category) {
  return {
    id: category._id.toHexString(),
    name: category.name,
    version: category.version,
  };
}
export type CategoryDto = ReturnType<typeof categoryDto>;
