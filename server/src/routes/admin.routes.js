import { Router } from 'express';
import { requireAdmin } from '../middleware/require-admin.js';
import ordersRoutes from './admin-orders.routes.js';
import productsRoutes from './admin-products.routes.js';
import reviewsRoutes from './admin-reviews.routes.js';

// One check for everything under /api/admin, so no admin route can forget it.
const router = Router();

router.use(requireAdmin);
router.use(productsRoutes);
router.use('/orders', ordersRoutes);
router.use('/reviews', reviewsRoutes);

export default router;
