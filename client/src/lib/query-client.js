import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { ApiError } from './api.js';
import { ME_KEY } from './session.js';

// `401 UNAUTHORIZED` from any request means the session is over (the cookie ran out, or the user was deleted).
// Saying so in the cache turns the user into a guest, so the route guards send them to sign in, instead of the
// page showing a plain error that "Try again" cannot fix. A wrong password is `401 INVALID_CREDENTIALS`: that
// is a different code and does nothing here.
export function createQueryClient() {
  const client = new QueryClient({
    queryCache: new QueryCache({ onError: endSession }),
    mutationCache: new MutationCache({ onError: endSession }),
  });

  function endSession(error) {
    if (error instanceof ApiError && error.status === 401 && error.code === 'UNAUTHORIZED') {
      client.setQueryData(ME_KEY, null);
    }
  }

  return client;
}
