import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { db } from '../../src/db/knex.js';
import { cleanTables, createUser, login } from '../helpers/db.js';

const DAY = 24 * 60 * 60;

let app;
beforeEach(async () => {
  await cleanTables();
  app = createApp(); // a fresh app has fresh rate limiters
});
afterAll(() => db.destroy());

const validRegistration = (overrides = {}) => ({
  firstName: 'Anna',
  lastName: 'Kim',
  email: 'anna@example.com',
  password: 'password123',
  acceptTerms: true,
  ...overrides,
});

const sessionCookie = (res) => res.headers['set-cookie']?.find((cookie) => cookie.startsWith('token='));
const maxAge = (cookie) => Number(cookie.match(/Max-Age=(\d+)/)?.[1]);
const userCount = async () => Number((await db('users').count({ n: '*' }).first()).n);

function keysOf(value) {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
  }
  return [];
}

describe('POST /api/auth/register', () => {
  it('creates a customer, signs them in, and never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(validRegistration());

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      data: {
        user: {
          id: expect.any(Number),
          firstName: 'Anna',
          lastName: 'Kim',
          email: 'anna@example.com',
          role: 'customer',
        },
      },
    });
    expect(keysOf(res.body).join(' ')).not.toMatch(/password|hash/i);

    const row = await db('users').where({ email: 'anna@example.com' }).first();
    expect(row).toMatchObject({ first_name: 'Anna', last_name: 'Kim', role: 'customer' });
    expect(row.password_hash).toMatch(/^\$2[aby]\$/);
    expect(await bcrypt.compare('password123', row.password_hash)).toBe(true);
  });

  it('sets a 1 day session cookie that works straight away', async () => {
    const agent = request.agent(app);

    const res = await agent.post('/api/auth/register').send(validRegistration());
    const me = await agent.get('/api/auth/me');

    expect(maxAge(sessionCookie(res))).toBe(DAY);
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('anna@example.com');
  });

  it('trims and lower-cases the email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validRegistration({ email: '  Anna@Example.COM ' }));

    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('anna@example.com');
    expect(await db('users').where({ email: 'anna@example.com' }).first()).toBeTruthy();
  });

  it('gives 409 EMAIL_TAKEN for an email that exists, in any case, and creates nothing', async () => {
    await createUser({ email: 'anna@example.com' });

    const res = await request(app)
      .post('/api/auth/register')
      .send(validRegistration({ email: 'ANNA@example.com' }));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
    expect(await userCount()).toBe(1);
  });

  it('lets only one of two registrations at the same time win', async () => {
    const [a, b] = await Promise.all([
      request(app).post('/api/auth/register').send(validRegistration()),
      request(app)
        .post('/api/auth/register')
        .send(validRegistration({ firstName: 'Other' })),
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
    expect(await userCount()).toBe(1);
  });

  it('always creates a customer, whatever role the request asks for', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validRegistration(), role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('customer');
    expect((await db('users').first()).role).toBe('customer');
  });

  it.each([
    ['no body', {}],
    ['an empty first name', validRegistration({ firstName: '' })],
    ['a first name over 60 characters', validRegistration({ firstName: 'a'.repeat(61) })],
    ['an invalid email', validRegistration({ email: 'anna@' })],
    ['a password of 7 characters', validRegistration({ password: '1234567' })],
    ['a password of 73 bytes', validRegistration({ password: 'a'.repeat(73) })],
    ['a password of 37 two-byte letters (74 bytes)', validRegistration({ password: 'é'.repeat(37) })],
    ['terms not accepted', validRegistration({ acceptTerms: false })],
    ['terms missing', (({ acceptTerms: _skip, ...rest }) => rest)(validRegistration())],
  ])('gives 400 VALIDATION_ERROR for %s, and creates nothing', async (_name, body) => {
    const res = await request(app).post('/api/auth/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.length).toBeGreaterThan(0);
    expect(sessionCookie(res)).toBeUndefined();
    expect(await userCount()).toBe(0);
  });

  it('accepts a password of exactly 72 bytes', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(validRegistration({ password: 'a'.repeat(72) }));

    expect(res.status).toBe(201);
  });

  it('gives 400 for a body that is not valid JSON', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Content-Type', 'application/json')
      .send('{oops');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with the right email and password', async () => {
    const user = await createUser({ firstName: 'Anna', lastName: 'Kim', email: 'anna@example.com' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        user: {
          id: user.id,
          firstName: 'Anna',
          lastName: 'Kim',
          email: 'anna@example.com',
          role: 'customer',
        },
      },
    });
    expect(keysOf(res.body).join(' ')).not.toMatch(/password|hash/i);
  });

  it('sets a session cookie for 1 day without "Keep me signed in"', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });

    expect(maxAge(sessionCookie(res))).toBe(DAY);
  });

  it('sets a session cookie for 30 days with "Keep me signed in"', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password, remember: true });

    expect(maxAge(sessionCookie(res))).toBe(30 * DAY);
  });

  it('the cookie is HttpOnly, SameSite=Lax and for the whole site (and not Secure outside production)', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    const cookie = sessionCookie(res);

    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Secure');
  });

  it('ignores the case and the spaces around the email', async () => {
    const user = await createUser({ email: 'anna@example.com' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '  ANNA@Example.com ', password: user.password });

    expect(res.status).toBe(200);
  });

  it('gives the identical 401 for a wrong password and for an unknown email', async () => {
    const user = await createUser();

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(sessionCookie(wrongPassword)).toBeUndefined();
  });

  it('compares the password even for an unknown email (so the time does not give the email away)', async () => {
    const compare = vi.spyOn(bcrypt, 'compare');

    await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'whatever1' });

    expect(compare).toHaveBeenCalledOnce();
    compare.mockRestore();
  });

  it.each([
    ['no body', {}],
    ['no password', { email: 'anna@example.com' }],
    ['an empty password', { email: 'anna@example.com', password: '' }],
    ['an invalid email', { email: 'nope', password: 'password123' }],
    ['"remember" as text', { email: 'anna@example.com', password: 'password123', remember: 'yes' }],
  ])('gives 400 VALIDATION_ERROR for %s', async (_name, body) => {
    const res = await request(app).post('/api/auth/login').send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('does not let the real password plus extra characters in (bcrypt reads only 72 bytes)', async () => {
    const user = await createUser({ email: 'long@example.com', password: 'a'.repeat(72) });

    const exact = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password });
    const longer = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: `${user.password}xyz` });

    expect(exact.status).toBe(200);
    expect(longer.status).toBe(400);
  });
});

describe('the session: GET /api/auth/me and POST /api/auth/logout', () => {
  it('me: gives 401 UNAUTHORIZED when signed out, in the shared error format', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('me: gives the signed-in user, without the password hash', async () => {
    const user = await createUser({ firstName: 'Anna', lastName: 'Kim' });
    const agent = await login(app, user);

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({
      id: user.id,
      firstName: 'Anna',
      lastName: 'Kim',
      email: user.email,
      role: 'customer',
    });
    expect(keysOf(res.body).join(' ')).not.toMatch(/password|hash/i);
  });

  it.each([
    ['garbage', () => 'not-a-token'],
    ['a token with a changed signature', () => jwt.sign({ sub: '1' }, env.JWT_SECRET).slice(0, -3) + 'abc'],
    ['a token signed with another secret', () => jwt.sign({ sub: '1' }, 'another-secret')],
    ['an expired token', () => jwt.sign({ sub: '1' }, env.JWT_SECRET, { expiresIn: -10 })],
  ])('me: gives 401 for %s', async (_name, makeToken) => {
    await createUser();

    const res = await request(app).get('/api/auth/me').set('Cookie', `token=${makeToken()}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('me: gives 401 once the user is deleted, even with a valid token', async () => {
    const user = await createUser();
    const agent = await login(app, user);
    await db('users').where({ id: user.id }).delete();

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(401);
  });

  it('me: reads the role from the database, not from the token', async () => {
    const user = await createUser();
    const agent = await login(app, user);
    expect((await agent.get('/api/auth/me')).body.data.user.role).toBe('customer');

    await db('users').where({ id: user.id }).update({ role: 'admin' });

    expect((await agent.get('/api/auth/me')).body.data.user.role).toBe('admin');
  });

  it('the admin from the seed signs in as an admin', async () => {
    const admin = await createUser({ email: 'admin@example.com', role: 'admin' });
    const agent = await login(app, admin);

    expect((await agent.get('/api/auth/me')).body.data.user.role).toBe('admin');
  });

  it('logout: clears the cookie, and the next request is signed out', async () => {
    const agent = await login(app, await createUser());

    const res = await agent.post('/api/auth/logout');

    expect(res.status).toBe(204);
    expect(sessionCookie(res)).toContain('Expires=Thu, 01 Jan 1970');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('logout: gives 401 when signed out', async () => {
    const res = await request(app).post('/api/auth/logout');

    expect(res.status).toBe(401);
  });

  it('a user only ever sees their own account', async () => {
    const anna = await login(app, await createUser({ email: 'anna@example.com' }));
    const bo = await login(app, await createUser({ email: 'bo@example.com' }));

    expect((await anna.get('/api/auth/me')).body.data.user.email).toBe('anna@example.com');
    expect((await bo.get('/api/auth/me')).body.data.user.email).toBe('bo@example.com');
  });
});

// The limits are in business-rules.md (Accounts). `X-Forwarded-For` only counts when the app trusts one
// proxy, like the real server behind a reverse proxy.
describe('rate limits', () => {
  const behindProxy = () => createApp({ trustProxy: 1 });
  const from = (ip) => ({ 'X-Forwarded-For': ip });
  const failedLogin = (target, ip, email) =>
    request(target).post('/api/auth/login').set(from(ip)).send({ email, password: 'wrong-password' });

  it('the 11th failed sign in from one IP gets 429 RATE_LIMITED, with the RateLimit headers', async () => {
    const target = behindProxy();
    for (let i = 1; i <= 10; i++) {
      // a different email each time, so only the IP limit is reached
      expect((await failedLogin(target, '203.0.113.5', `try${i}@example.com`)).status).toBe(401);
    }

    const res = await failedLogin(target, '203.0.113.5', 'try11@example.com');

    expect(res.status).toBe(429);
    expect(res.body).toEqual({
      error: { message: 'Too many attempts. Try again later.', code: 'RATE_LIMITED' },
    });
    expect(res.headers).toHaveProperty('ratelimit');
    expect(res.headers).toHaveProperty('ratelimit-policy');
  });

  it('another IP is not affected', async () => {
    const target = behindProxy();
    const user = await createUser();
    for (let i = 1; i <= 11; i++) await failedLogin(target, '203.0.113.5', `try${i}@example.com`);

    const res = await request(target)
      .post('/api/auth/login')
      .set(from('198.51.100.7'))
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(200);
  });

  it('successful sign ins never count towards the limit', async () => {
    const target = behindProxy();
    const user = await createUser();
    for (let i = 1; i <= 15; i++) {
      const ok = await request(target)
        .post('/api/auth/login')
        .set(from('203.0.113.5'))
        .send({ email: user.email, password: user.password });
      expect(ok.status).toBe(200);
    }

    const res = await failedLogin(target, '203.0.113.5', 'someone@example.com');

    expect(res.status).toBe(401);
  });

  it('the 11th failed try on one email, from different IPs, gets 429', async () => {
    const target = behindProxy();
    const user = await createUser();
    for (let i = 1; i <= 10; i++) {
      expect((await failedLogin(target, `203.0.113.${i}`, user.email)).status).toBe(401);
    }

    const res = await failedLogin(target, '203.0.113.99', user.email);

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
  });

  it('the email limit also blocks the right password while it lasts, and counts the email in any case', async () => {
    const target = behindProxy();
    const user = await createUser({ email: 'anna@example.com' });
    for (let i = 1; i <= 5; i++) await failedLogin(target, `203.0.113.${i}`, 'ANNA@example.com');
    for (let i = 6; i <= 10; i++) await failedLogin(target, `203.0.113.${i}`, '  anna@example.com ');

    const res = await request(target)
      .post('/api/auth/login')
      .set(from('203.0.113.50'))
      .send({ email: user.email, password: user.password });

    expect(res.status).toBe(429);
  });

  it('the 11th register in an hour gets 429, and creates nothing', async () => {
    const target = behindProxy();
    for (let i = 1; i <= 10; i++) {
      const ok = await request(target)
        .post('/api/auth/register')
        .set(from('203.0.113.5'))
        .send(validRegistration({ email: `new${i}@example.com` }));
      expect(ok.status).toBe(201);
    }

    const res = await request(target)
      .post('/api/auth/register')
      .set(from('203.0.113.5'))
      .send(validRegistration({ email: 'new11@example.com' }));

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('RATE_LIMITED');
    expect(await userCount()).toBe(10);
  });

  it('every register request counts, even a rejected one', async () => {
    const target = behindProxy();
    for (let i = 1; i <= 10; i++) {
      const bad = await request(target).post('/api/auth/register').set(from('203.0.113.5')).send({});
      expect(bad.status).toBe(400);
    }

    const res = await request(target)
      .post('/api/auth/register')
      .set(from('203.0.113.5'))
      .send(validRegistration());

    expect(res.status).toBe(429);
  });

  it('without a proxy, X-Forwarded-For is ignored (nobody can fake their IP to get around the limit)', async () => {
    const target = createApp(); // trust proxy off
    for (let i = 1; i <= 10; i++) {
      expect((await failedLogin(target, `203.0.113.${i}`, `try${i}@example.com`)).status).toBe(401);
    }

    const res = await failedLogin(target, '203.0.113.200', 'try11@example.com');

    expect(res.status).toBe(429);
  });

  it('each app has its own counters, so tests never leak 429s into each other', async () => {
    const first = behindProxy();
    for (let i = 1; i <= 11; i++) await failedLogin(first, '203.0.113.5', `try${i}@example.com`);
    expect((await failedLogin(first, '203.0.113.5', 'again@example.com')).status).toBe(429);

    const second = behindProxy();

    expect((await failedLogin(second, '203.0.113.5', 'again@example.com')).status).toBe(401);
  });
});
