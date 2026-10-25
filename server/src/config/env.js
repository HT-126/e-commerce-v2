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

// Wrong values, not only missing ones. Pure, so a test can try it with plain objects.
export function envProblems(vars) {
  const problems = [];
  if (vars.TRUST_PROXY && !/^\d+$/.test(vars.TRUST_PROXY)) {
    problems.push(
      'TRUST_PROXY must be a whole number (how many proxies are in front of the API), for example 1',
    );
  }
  if (vars.NODE_ENV === 'production' && (vars.JWT_SECRET ?? '').length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters in production');
  }
  return problems;
}

const problems = envProblems(process.env);
if (problems.length > 0) {
  console.error(`Wrong environment values:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}

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
