import { Router } from 'express';
import * as controller from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { loginUserSchema, registerUserSchema } from '../schemas/auth.schema.js';

// The limiters come from the app, so each app (and each test) has its own counters.
// Order on a route: limiters first, then validate, then the controller.
export function createAuthRoutes({ loginIpLimiter, loginEmailLimiter, registerLimiter }) {
  const router = Router();

  router.post('/register', registerLimiter, validate({ body: registerUserSchema }), controller.register);
  router.post(
    '/login',
    loginIpLimiter,
    loginEmailLimiter,
    validate({ body: loginUserSchema }),
    controller.login,
  );
  router.post('/logout', requireAuth, controller.logout);
  router.get('/me', requireAuth, controller.me);

  return router;
}
