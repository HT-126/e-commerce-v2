import { Router } from 'express';
import * as controller from '../controllers/cart.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import {
  cartItemParamsSchema,
  mergeCartSchema,
  quoteCartSchema,
  setCartItemSchema,
} from '../schemas/cart.schema.js';

const router = Router();

// A guest has no account yet, so pricing a guest cart needs no sign in.
router.post('/quote', validate({ body: quoteCartSchema }), controller.quote);

router.use(requireAuth);
router.get('/', controller.get);
router.put(
  '/items/:variantId',
  validate({ params: cartItemParamsSchema, body: setCartItemSchema }),
  controller.setItem,
);
router.delete('/items/:variantId', validate({ params: cartItemParamsSchema }), controller.removeItem);
router.post('/merge', validate({ body: mergeCartSchema }), controller.merge);

export default router;
