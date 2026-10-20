import { ObjectId, type ClientSession, type Db } from 'mongodb';
import { ApiError } from '../shared/http/api-error.js';
import { isDuplicateNameKey } from '../shared/text/catalog-text.js';
import {
  categoriesCollection,
  categoryDto,
  type Category,
} from './categories.model.js';
import {
  categoryNameKey,
  type DeleteCategoryInput,
  type UpdateCategoryInput,
} from './categories.schemas.js';

const collator = new Intl.Collator('es');

// US-007, shared rule of concurrency, category wording (US-008 CA-05).
// Diagnostic for the API; the UI shows its own copy of the same text.
export const CATEGORY_VERSION_CONFLICT_MESSAGE =
  'Esta categoría cambió mientras la editabas. Revisa la versión actual y vuelve a aplicar tus cambios.';
export const CATEGORY_NOT_EMPTY_MESSAGE =
  'No puedes eliminar una categoría con productos asociados, incluidos los inactivos.';

export const isDuplicateCategoryName = isDuplicateNameKey;

const notFound = () => new ApiError('NOT_FOUND', 'Recurso no encontrado.');
const duplicateName = () =>
  new ApiError('DUPLICATE_NAME', 'Nombre de categoría duplicado.');

// Internal signal: aborts the transaction, then becomes VERSION_CONFLICT.
class StaleCategoryVersion extends Error {}

export function createCategoriesService(
  db: Db,
  clock: () => Date = () => new Date(),
) {
  const categories = categoriesCollection(db);

  // After a versioned write matched nothing: missing (404) or stale.
  async function rejectUnmatched(
    session: ClientSession,
    id: ObjectId,
  ): Promise<never> {
    const exists = await categories.findOne(
      { _id: id },
      { session, projection: { _id: 1 } },
    );
    if (!exists) throw notFound();
    throw new StaleCategoryVersion();
  }

  /**
   * Answer to a stale save, same shape as products: 409 with the current
   * version, read after the aborted transaction; 404 if it vanished.
   */
  async function versionConflict(id: ObjectId): Promise<ApiError> {
    const current = await categories.findOne({ _id: id });
    if (!current) return notFound();
    return new ApiError('VERSION_CONFLICT', CATEGORY_VERSION_CONFLICT_MESSAGE, {
      current: categoryDto(current),
    });
  }

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
        if (isDuplicateCategoryName(error)) throw duplicateName();
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

    /**
     * Renaming (US-008 CA-03/CA-05). Applies only to the expected version and
     * increments it, so the first valid save of a version wins; it always
     * increments, even with the same name, like the product edition. The
     * identity and `productCount` are untouched, so product associations are
     * kept. The unique `nameKey` index alone decides duplicates; the own name
     * matches the same document. Filters by identity only: no global lock.
     */
    async rename(id: string, input: UpdateCategoryInput) {
      const categoryId = new ObjectId(id);
      const changes = {
        name: input.name,
        nameKey: categoryNameKey(input.name),
        updatedAt: clock(),
      };
      const outcome: { category?: Category } = {};
      const session = db.client.startSession();
      try {
        await session.withTransaction(async () => {
          // The callback may be retried: never keep state of a failed attempt.
          delete outcome.category;
          const after = await categories.findOneAndUpdate(
            { _id: categoryId, version: input.version },
            { $set: changes, $inc: { version: 1 } },
            { session, returnDocument: 'after' },
          );
          if (!after) await rejectUnmatched(session, categoryId);
          else outcome.category = after;
        });
      } catch (error) {
        if (isDuplicateCategoryName(error)) throw duplicateName();
        if (error instanceof StaleCategoryVersion)
          throw await versionConflict(categoryId);
        throw error;
      } finally {
        await session.endSession();
      }
      if (!outcome.category)
        throw new ApiError(
          'INTERNAL_ERROR',
          'No se pudo completar la solicitud.',
        );
      return categoryDto(outcome.category);
    },

    /**
     * Deletion (US-008 CA-04/CA-05). One conditional delete on the expected
     * version and a zero association counter, inactive products included.
     * Assignment reserves the reference by writing the same document inside
     * its own transaction, so both compete for it: either the product keeps
     * an existing category and this is rejected, or the category is gone and
     * the assignment aborts. The version is checked before the counter.
     */
    async remove(id: string, input: DeleteCategoryInput) {
      const categoryId = new ObjectId(id);
      const session = db.client.startSession();
      try {
        await session.withTransaction(async () => {
          const removed = await categories.deleteOne(
            { _id: categoryId, version: input.version, productCount: 0 },
            { session },
          );
          if (removed.deletedCount === 1) return;
          const current = await categories.findOne(
            { _id: categoryId },
            { session, projection: { version: 1, productCount: 1 } },
          );
          if (!current) throw notFound();
          if (current.version !== input.version)
            throw new StaleCategoryVersion();
          throw new ApiError('CATEGORY_NOT_EMPTY', CATEGORY_NOT_EMPTY_MESSAGE);
        });
      } catch (error) {
        if (error instanceof StaleCategoryVersion)
          throw await versionConflict(categoryId);
        throw error;
      } finally {
        await session.endSession();
      }
    },
  };
}
