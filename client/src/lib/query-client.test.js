import { describe, expect, it } from 'vitest';
import { ApiError } from './api.js';
import { createQueryClient } from './query-client.js';
import { ME_KEY } from './session.js';

const user = { id: 1, firstName: 'Anna', lastName: 'Kim', email: 'a@example.com', role: 'admin' };

// A query or a mutation that fails with `error`, in a client that has a signed-in user.
async function fail(error, kind = 'query') {
  const client = createQueryClient();
  client.setQueryData(ME_KEY, user);
  if (kind === 'query') {
    await client.fetchQuery({ queryKey: ['x'], queryFn: () => Promise.reject(error), retry: false }).catch(() => {});
  } else {
    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(error) })
      .execute()
      .catch(() => {});
  }
  return client.getQueryData(ME_KEY);
}

describe('createQueryClient', () => {
  it('makes the user a guest when a query says the session is over (401 UNAUTHORIZED)', async () => {
    expect(await fail(new ApiError(401, 'UNAUTHORIZED', 'Please sign in'))).toBeNull();
  });

  it('does the same when a mutation says so', async () => {
    expect(await fail(new ApiError(401, 'UNAUTHORIZED', 'Please sign in'), 'mutation')).toBeNull();
  });

  it('keeps the user for a wrong password (401 INVALID_CREDENTIALS)', async () => {
    expect(await fail(new ApiError(401, 'INVALID_CREDENTIALS', 'Wrong email or password'), 'mutation')).toEqual(user);
  });

  it.each([
    ['a forbidden request', new ApiError(403, 'FORBIDDEN', 'Not allowed')],
    ['a server error', new ApiError(500, undefined, 'Something went wrong')],
    ['no network', new TypeError('Failed to fetch')],
    ['a 401 with no code', new ApiError(401, undefined, 'x')],
  ])('keeps the user after %s', async (_name, error) => {
    expect(await fail(error)).toEqual(user);
  });
});
