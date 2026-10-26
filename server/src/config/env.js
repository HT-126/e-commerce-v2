import 'dotenv/config';

// The test database is only for development and tests. A host (Render, ...) has none, so in production the server
// does not ask for it. Pure, so a test can try it.
export function requiredVars(nodeEnv) {
  const names = [
    'PORT',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'DB_NAME_TEST',
    'JWT_SECRET',
  ];
  return nodeEnv === 'production' ? names.filter((name) => name !== 'DB_NAME_TEST') : names;
}

// Stop at startup with a clear message, not later with a confusing database error.
export function requireVars(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}. See server/.env.example.`);
    process.exit(1);
  }
}

requireVars(requiredVars(process.env.NODE_ENV));

// Wrong values, not only missing ones. Pure, so a test can try it with plain objects.
export function envProblems(vars) {
  const problems = [];
  if (vars.TRUST_PROXY && !/^\d+$/.test(vars.TRUST_PROXY)) {
    problems.push(
      'TRUST_PROXY must be a whole number (how many proxies are in front of the API), for example 1',
    );
  }
  if (vars.COOKIE_SECURE && !['true', 'false'].includes(vars.COOKIE_SECURE)) {
    problems.push('COOKIE_SECURE must be true or false');
  }
  if (vars.DB_SSL && !['true', 'false'].includes(vars.DB_SSL)) {
    problems.push('DB_SSL must be true or false');
  }
  if (vars.DB_SSL_CA && vars.DB_SSL !== 'true') {
    problems.push('DB_SSL_CA is only used when DB_SSL is true');
  }
  if (vars.NODE_ENV === 'production' && (vars.JWT_SECRET ?? '').length < 32) {
    problems.push('JWT_SECRET must be at least 32 characters in production');
  }
  return problems;
}

// `Secure` cookies are only sent over HTTPS. They are on in production, unless COOKIE_SECURE says otherwise: the
// local Docker run is plain http://localhost and sets it to false. Pure, so a test can try it with plain objects.
export function cookieSecure(vars) {
  return vars.COOKIE_SECURE ? vars.COOKIE_SECURE === 'true' : vars.NODE_ENV === 'production';
}

// A hosted MySQL (Aiven, ...) only accepts encrypted connections. With DB_SSL=true the connection is encrypted and
// the server's certificate is checked; DB_SSL_CA is the certificate of the authority that signed it (the host
// gives it). A host's form may flatten line breaks, so `\n` written as text counts as a line break. Pure.
export function dbSsl(vars) {
  if (vars.DB_SSL !== 'true') return undefined;
  const ssl = { rejectUnauthorized: true };
  if (vars.DB_SSL_CA) ssl.ca = vars.DB_SSL_CA.replaceAll('\\n', '\n');
  return ssl;
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
  COOKIE_SECURE: cookieSecure(process.env),
  // Options for an encrypted database connection, or undefined for a plain one (see dbSsl).
  DB_SSL_OPTIONS: dbSsl(process.env),
  // Number of proxies in front of the API. Unset unless there is one (see backend.md).
  TRUST_PROXY: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : null,
};
