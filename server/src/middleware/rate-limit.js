import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

// Values from business-rules.md (Accounts). Counts live in memory, per limiter.
// `createApp()` makes a fresh set for each app, so one test's failed sign-ins never cause a 429 in another.
// The limits are never turned off in tests: they are tested.
const MINUTE = 60 * 1000;

const handler = (req, res) => {
  res.status(429).json({ error: { message: 'Too many attempts. Try again later.', code: 'RATE_LIMITED' } });
};

const base = { standardHeaders: 'draft-7', legacyHeaders: false, handler };

// Runs before Zod, so the email is trimmed and lower-cased here. Without an email, fall back to the IP.
export const emailKey = (req) => {
  const email = String(req.body?.email ?? '')
    .trim()
    .toLowerCase();
  return email || ipKeyGenerator(req.ip);
};

export function createRateLimiters() {
  return {
    // Sign in, per IP: 10 failed tries per 15 minutes. A successful sign in does not count.
    loginIpLimiter: rateLimit({
      ...base,
      windowMs: 15 * MINUTE,
      limit: 10,
      skipSuccessfulRequests: true,
    }),
    // Sign in, per email: 10 failed tries per 15 minutes for the same email, from any IP.
    loginEmailLimiter: rateLimit({
      ...base,
      windowMs: 15 * MINUTE,
      limit: 10,
      skipSuccessfulRequests: true,
      keyGenerator: emailKey,
    }),
    // Register, per IP: 10 requests per hour. Every request counts.
    registerLimiter: rateLimit({
      ...base,
      windowMs: 60 * MINUTE,
      limit: 10,
    }),
  };
}
