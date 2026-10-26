import { db } from '../src/db/knex.js';

// Prints `empty` when the database has no products yet, `filled` when it has. docker-start.sh uses the answer to
// download and seed only a database that needs it. If the database cannot be read this fails (exit code 1), so the
// caller stops instead of mistaking a broken connection for a filled catalog.
try {
  const [{ n }] = await db('products').count({ n: '*' });
  console.log(Number(n) === 0 ? 'empty' : 'filled');
} finally {
  await db.destroy();
}
