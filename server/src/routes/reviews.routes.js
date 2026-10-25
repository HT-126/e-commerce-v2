import { Router } from 'express';
import * as controller from '../controllers/reviews.controller.js';
import { requireAuth } from '../middleware/require-auth.js';
import { validate } from '../middleware/validate.js';
import { getProductSchema } from '../schemas/products.schema.js';
import { listReviewsSchema, saveReviewSchema } from '../schemas/reviews.schema.js';

// Mounted at /api/products/:slug/reviews. `mergeParams` gives the routes the `slug`.
const router = Router({ mergeParams: true });

router.get('/', validate({ params: getProductSchema, query: listReviewsSchema }), controller.list);

router.use('/mine', requireAuth);
router.get('/mine', validate({ params: getProductSchema }), controller.mine);
router.put('/mine', validate({ params: getProductSchema, body: saveReviewSchema }), controller.save);
router.delete('/mine', validate({ params: getProductSchema }), controller.remove);

export default router;
