// The TanStack Query key of the signed-in user (`GET /api/auth/me`). One place, so the code that notices an
// ended session and the code that reads the user use the same key.
export const ME_KEY = ['me'];
