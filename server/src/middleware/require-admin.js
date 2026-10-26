import { AppError } from '../utils/app-error.js';
import { requireAuth } from './require-auth.js';

// `requireAuth` loads the user from the database on every request, so the role checked here is the one in
// the database now, never one read from the cookie. Signed out is 401, a customer is 403.
function checkAdmin(req, res, next) {
  if (req.user.role !== 'admin') throw new AppError(403, 'Not allowed', 'FORBIDDEN');
  next();
}

export const requireAdmin = [requireAuth, checkAdmin];
