import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/api.js';
import { stubApi } from '../test-utils.jsx';
import { getMe } from './auth.js';

afterEach(() => vi.unstubAllGlobals());

describe('getMe', () => {
  it('gives the user', async () => {
    stubApi(() => ({ body: { data: { user: { id: 1, firstName: 'Anna' } } } }));

    expect(await getMe()).toEqual({ id: 1, firstName: 'Anna' });
  });

  it('gives null for a guest: a 401 is not an error here', async () => {
    stubApi(() => ({ status: 401, body: { error: { message: 'Please sign in', code: 'UNAUTHORIZED' } } }));

    expect(await getMe()).toBeNull();
  });

  it('still throws for a real failure, like a server error', async () => {
    stubApi(() => ({ status: 500, body: { error: { message: 'Something went wrong' } } }));

    await expect(getMe()).rejects.toBeInstanceOf(ApiError);
  });
});
