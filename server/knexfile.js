import path from 'node:path';
import { env } from './src/config/env.js';

const connection = (database) => ({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database,
  charset: 'utf8mb4',
});

const base = {
  client: 'mysql2',
  migrations: { directory: path.join(import.meta.dirname, 'db/migrations') },
  seeds: { directory: path.join(import.meta.dirname, 'db/seeds') },
};

const development = { ...base, connection: connection(env.DB_NAME) };

export default {
  development,
  production: development,
  test: { ...base, connection: connection(env.DB_NAME_TEST) },
};
