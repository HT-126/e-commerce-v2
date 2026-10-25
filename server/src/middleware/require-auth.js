import { getUser } from '../services/auth.service.js';
import { AppError } from '../utils/app-error.js';
import { COOKIE_NAME, verifyToken } from '../utils/session.js';

// Reads the session cookie, then loads the user from the database on every request:
// a deleted user or a changed role takes effect at once. Sets `req.user`.
export async function requireAuth(req, res, next) {
  const userId = verifyToken(req.cookies?.[COOKIE_NAME]);
  const user = userId ? await getUser(userId) : null;
  if (!user) throw new AppError(401, 'Please sign in', 'UNAUTHORIZED');

  req.user = user;
  next();
}
