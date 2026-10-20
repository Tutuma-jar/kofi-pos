import type { ClientSession, Db, ObjectId } from 'mongodb';
import { ApiError } from '../shared/http/api-error.js';
import { categoriesCollection } from './categories.model.js';

/**
 * Internal reference contract for product assignment (TASK-016/018/022).
 * Call only inside the caller's `session.withTransaction`, together with the
 * product write. Writing the category document makes assignment and deletion
 * compete for it; reading existence first would not prevent races.
 * Neither function changes `version` nor `updatedAt`: they are not edits.
 */
export async function reserveCategoryReference(
  db: Db,
  session: ClientSession,
  categoryId: ObjectId,
): Promise<void> {
  const result = await categoriesCollection(db).updateOne(
    { _id: categoryId },
    { $inc: { productCount: 1 } },
    { session },
  );
  if (result.matchedCount === 0)
    throw new ApiError('VALIDATION_ERROR', 'Categoría inexistente.', {
      fields: [{ field: 'categoryId', code: 'NOT_ALLOWED' }],
    });
}

export async function releaseCategoryReference(
  db: Db,
  session: ClientSession,
  categoryId: ObjectId,
): Promise<void> {
  const result = await categoriesCollection(db).updateOne(
    { _id: categoryId, productCount: { $gt: 0 } },
    { $inc: { productCount: -1 } },
    { session },
  );
  // A missing or zero counter means a broken invariant, never a client error.
  if (result.matchedCount === 0)
    throw new ApiError('INTERNAL_ERROR', 'No se pudo completar la solicitud.');
}
