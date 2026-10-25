import { Router } from 'express';
import * as controller from '../controllers/products.controller.js';
import { validate } from '../middleware/validate.js';
import { getProductSchema, listProductsSchema } from '../schemas/products.schema.js';

const router = Router();

router.get('/', validate({ query: listProductsSchema }), controller.list);
router.get('/:slug', validate({ params: getProductSchema }), controller.getOne);
router.get('/:slug/related', validate({ params: getProductSchema }), controller.related);

export default router;
