import { AppError } from '../utils/app-error.js';

// Stub: always 401 until the Accounts feature reads the JWT cookie.
export function requireAuth(req, res, next) {
  next(new AppError(401, 'Please sign in', 'UNAUTHORIZED'));
}
