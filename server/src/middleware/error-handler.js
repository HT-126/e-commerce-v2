import { AppError } from '../utils/app-error.js';

export function notFoundHandler(req, res, next) {
  next(new AppError(404, 'Not found', 'NOT_FOUND'));
}

// Express needs all four arguments to treat this as an error handler.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Invalid JSON', code: 'VALIDATION_ERROR' } });
  }

  if (err instanceof AppError) {
    const { message, code, details } = err;
    return res.status(err.status).json({ error: { message, code, details } });
  }

  // Log the real error on the server only. Never send stack traces to the client.
  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong' } });
}
