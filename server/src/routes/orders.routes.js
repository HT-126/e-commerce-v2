import { Router } from 'express';
import * as controller from '../controllers/orders.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { getOrderSchema, listOrdersSchema } from '../schemas/orders.schema.js';

const router = Router();

router.use(requireAuth);
router.post('/', controller.place);
router.get('/', validate({ query: listOrdersSchema }), controller.list);
router.get('/:orderNumber', validate({ params: getOrderSchema }), controller.getOne);

export default router;
