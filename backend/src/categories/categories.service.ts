import { ObjectId, type Db } from 'mongodb';
import { ApiError } from '../shared/http/api-error.js';
import { isDuplicateNameKey } from '../shared/text/catalog-text.js';
import {
  categoriesCollection,
  categoryDto,
  type Category,
} from './categories.model.js';
import { categoryNameKey } from './categories.schemas.js';

const collator = new Intl.Collator('es');

export const isDuplicateCategoryName = isDuplicateNameKey;

export function createCategoriesService(
  db: Db,
  clock: () => Date = () => new Date(),
) {
  const categories = categoriesCollection(db);
  return {
    // Only the unique index decides duplicates, also under concurrent creation.
    async create(name: string) {
      const now = clock();
      const category: Category = {
        _id: new ObjectId(),
        name,
        nameKey: categoryNameKey(name),
        productCount: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      try {
        await categories.insertOne(category);
      } catch (error) {
        if (isDuplicateCategoryName(error))
          throw new ApiError(
            'DUPLICATE_NAME',
            'Nombre de categoría duplicado.',
          );
        throw error;
      }
      return categoryDto(category);
    },
    async list() {
      const items = await categories
        .find({}, { projection: { _id: 1, name: 1, version: 1 } })
        .toArray();
      items.sort((a, b) => {
        const byName = collator.compare(a.name, b.name);
        if (byName !== 0) return byName;
        const left = a._id.toHexString();
        const right = b._id.toHexString();
        return left < right ? -1 : left > right ? 1 : 0;
      });
      return { items: items.map(categoryDto) };
    },
  };
}
