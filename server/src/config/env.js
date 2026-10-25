import 'dotenv/config';

const required = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'DB_NAME_TEST',
  'JWT_SECRET',
];

// Stop at startup with a clear message, not later with a confusing database error.
export function requireVars(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}. See server/.env.example.`);
    process.exit(1);
  }
}

requireVars(required);

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT),
  DB_HOST: process.env.DB_HOST,
  DB_PORT: Number(process.env.DB_PORT),
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_NAME_TEST: process.env.DB_NAME_TEST,
  JWT_SECRET: process.env.JWT_SECRET,
  // Number of proxies in front of the API. Unset unless there is one (see backend.md).
  TRUST_PROXY: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : null,
};
