import knex from 'knex';
import config from '../knexfile.js';

// Runs migrations once on the test database. Tests insert the rows they need.
export default async function setup() {
  const db = knex(config.test);
  try {
    await db.migrate.latest();
  } finally {
    await db.destroy();
  }
}
