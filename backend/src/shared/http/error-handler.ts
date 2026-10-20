import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { ApiError } from './api-error.js';

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  next,
) => {
  void next;
  let failure = new ApiError(
    'INTERNAL_ERROR',
    'No se pudo completar la solicitud.',
  );
  if (error instanceof ApiError) failure = error;
  else if (error instanceof ZodError) {
    failure = new ApiError('VALIDATION_ERROR', 'Solicitud inválida.', {
      fields: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        code:
          issue.code === 'unrecognized_keys'
            ? 'NOT_ALLOWED'
            : issue.code === 'too_small'
              ? 'TOO_SHORT'
              : issue.code === 'too_big'
                ? 'TOO_LONG'
                : 'INVALID_FORMAT',
      })),
    });
  } else if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.too.large')
      failure = new ApiError(
        'PAYLOAD_TOO_LARGE',
        'Solicitud demasiado grande.',
      );
    if (error.type === 'entity.parse.failed')
      failure = new ApiError('VALIDATION_ERROR', 'JSON inválido.');
    if (
      error.type === 'charset.unsupported' ||
      error.type === 'encoding.unsupported'
    )
      failure = new ApiError('UNSUPPORTED_MEDIA_TYPE', 'Formato no admitido.');
  }
  if (failure.code === 'UNAUTHORIZED') res.set('WWW-Authenticate', 'Bearer');
  if (failure.retryAfterSeconds !== undefined)
    res.set('Retry-After', String(failure.retryAfterSeconds));
  res.status(failure.status).json({
    error: {
      code: failure.code,
      message: failure.message,
      ...(failure.details === undefined ? {} : { details: failure.details }),
    },
  });
};
