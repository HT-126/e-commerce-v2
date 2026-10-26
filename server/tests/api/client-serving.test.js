import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/db/knex.js';

// A tiny "built client": an index.html and one asset, in a temporary folder.
let dir;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lumiere-client-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Lumière app</title><div id="root"></div>');
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'assets', 'app-123.js'), 'console.log("app")');
});
afterAll(async () => {
  fs.rmSync(dir, { recursive: true, force: true });
  await db.destroy();
});

describe('serving the built client', () => {
  it('serves index.html at the home address', async () => {
    const res = await request(createApp({ clientDir: dir })).get('/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Lumière app');
  });

  it('serves the files of the build', async () => {
    const res = await request(createApp({ clientDir: dir })).get('/assets/app-123.js');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/javascript/);
    expect(res.text).toBe('console.log("app")');
  });

  it.each(['/products/linen-midi-dress', '/shop/dresses?color=black', '/cart', '/admin/orders/LM-261025-4821', '/no/such/page'])(
    'serves index.html for the page address %s, so a refresh still opens the app',
    async (url) => {
      const res = await request(createApp({ clientDir: dir })).get(url);

      expect(res.status).toBe(200);
      expect(res.text).toContain('Lumière app');
    },
  );

  it('still answers the API as JSON', async () => {
    const res = await request(createApp({ clientDir: dir })).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it.each(['/api/no-such-thing', '/api', '/api/products/x/y/z'])(
    'answers an unknown API address %s with the JSON 404, never with the page',
    async (url) => {
      const res = await request(createApp({ clientDir: dir })).get(url);

      expect(res.status).toBe(404);
      expect(res.headers['content-type']).toMatch(/json/);
      expect(res.body.error.code).toBe('NOT_FOUND');
    },
  );

  it('answers a POST to an unknown address with the JSON 404, not the page', async () => {
    const res = await request(createApp({ clientDir: dir })).post('/somewhere').send({});

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('serves nothing but the API when there is no client folder (development)', async () => {
    const res = await request(createApp()).get('/');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('security headers of the site', () => {
  const policy = async (secure) => (await request(createApp({ clientDir: dir, secure })).get('/')).headers['content-security-policy'];

  it('lets pages show product photos from any https address (the photos live on other hosts)', async () => {
    expect(await policy(false)).toMatch(/img-src 'self' data: https:/);
  });

  it('still blocks scripts from other hosts', async () => {
    expect(await policy(false)).toMatch(/script-src 'self'(;|$)/);
  });

  it('upgrades insecure requests only on HTTPS, because it would break plain http://localhost', async () => {
    expect(await policy(true)).toContain('upgrade-insecure-requests');
    expect(await policy(false)).not.toContain('upgrade-insecure-requests');
  });
});
