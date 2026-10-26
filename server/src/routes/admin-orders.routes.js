import { Router } from 'express';
import * as controller from '../controllers/admin-orders.controller.js';
import { validate } from '../middleware/validate.js';
import { adminListOrdersSchema, updateOrderStatusSchema } from '../schemas/admin-orders.schema.js';
import { getOrderSchema } from '../schemas/orders.schema.js';

const router = Router();

router.get('/', validate({ query: adminListOrdersSchema }), controller.list);
router.get('/:orderNumber', validate({ params: getOrderSchema }), controller.getOne);
router.patch(
  '/:orderNumber',
  validate({ params: getOrderSchema, body: updateOrderStatusSchema }),
  controller.changeStatus,
);

export default router;
