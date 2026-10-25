import { Router } from 'express';
import { db } from '../db/knex.js';

const router = Router();

router.get('/', async (req, res) => {
  await db.raw('select 1');
  res.json({ data: { status: 'ok', db: 'ok' } });
});

export default router;
