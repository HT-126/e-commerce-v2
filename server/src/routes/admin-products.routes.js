import { Router } from 'express';
import * as controller from '../controllers/admin-products.controller.js';
import { validate } from '../middleware/validate.js';
import {
  adminListProductsSchema,
  createProductSchema,
  createVariantSchema,
  idParamsSchema,
  updateProductSchema,
  updateVariantSchema,
} from '../schemas/admin-products.schema.js';

// Mounted at /api/admin, so the variant routes can sit beside the product routes.
const router = Router();

router.get('/products', validate({ query: adminListProductsSchema }), controller.list);
router.post('/products', validate({ body: createProductSchema }), controller.create);
router.get('/products/:id', validate({ params: idParamsSchema }), controller.getOne);
router.patch(
  '/products/:id',
  validate({ params: idParamsSchema, body: updateProductSchema }),
  controller.update,
);
router.post(
  '/products/:id/variants',
  validate({ params: idParamsSchema, body: createVariantSchema }),
  controller.createVariant,
);
router.patch(
  '/variants/:id',
  validate({ params: idParamsSchema, body: updateVariantSchema }),
  controller.updateVariant,
);

export default router;
