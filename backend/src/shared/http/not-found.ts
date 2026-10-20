import type { RequestHandler } from 'express';
import { ApiError } from './api-error.js';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new ApiError('NOT_FOUND', 'Recurso no encontrado.'));
};
