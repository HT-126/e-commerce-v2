import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

// Values from business-rules.md (Accounts). Counts live in memory, per server process.
// Exported so tests can call limiter.resetKey(...) in beforeEach. Never turn them off in tests.
const MINUTE = 60 * 1000;

const handler = (req, res) => {
  res.status(429).json({ error: { message: 'Too many attempts. Try again later.', code: 'RATE_LIMITED' } });
};

const base = { standardHeaders: 'draft-7', legacyHeaders: false, handler };

export const loginIpLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
});

// Runs before Zod, so the email is trimmed and lower-cased here. Without an email, fall back to the IP.
export const emailKey = (req) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  return email || ipKeyGenerator(req.ip);
};

export const loginEmailLimiter = rateLimit({
  ...base,
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: emailKey,
});

export const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * MINUTE,
  limit: 10,
});
