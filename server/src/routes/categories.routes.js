import { Router } from 'express';
import * as controller from '../controllers/categories.controller.js';

const router = Router();

router.get('/', controller.list);

export default router;
