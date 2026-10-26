import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const COOKIE_NAME = 'token';

const DAY = 24 * 60 * 60;
// "Keep me signed in" lasts 30 days, without it 1 day (business-rules.md).
export const sessionSeconds = (remember) => (remember ? 30 : 1) * DAY;

// The token holds only the user id. The role is read from the database on every request.
export function signToken(userId, remember) {
  return jwt.sign({ sub: String(userId) }, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: sessionSeconds(remember),
  });
}

// The user id inside a valid token, or null (missing, wrong signature, expired, wrong algorithm).
export function verifyToken(token) {
  try {
    const { sub } = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    const id = Number(sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

// `Secure` (HTTPS only) in production, unless COOKIE_SECURE says otherwise (see config/env.js). Takes the flag as
// an argument so a test can check both.
export const cookieOptions = (secure = env.COOKIE_SECURE) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
  path: '/',
});

export function setSessionCookie(res, token, remember) {
  res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: sessionSeconds(remember) * 1000 });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, cookieOptions());
}
