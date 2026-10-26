import { Router } from 'express';
import * as controller from '../controllers/admin-reviews.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamsSchema } from '../schemas/admin-products.schema.js';
import { adminListReviewsSchema } from '../schemas/admin-reviews.schema.js';

const router = Router();

router.get('/', validate({ query: adminListReviewsSchema }), controller.list);
router.delete('/:id', validate({ params: idParamsSchema }), controller.remove);

export default router;
