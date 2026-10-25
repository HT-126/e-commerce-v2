import { ApiError, api } from '../lib/api.js';

// Who is signed in: the user, or null for a guest. A 401 here is not an error, it just means "not signed in".
export async function getMe() {
  try {
    return (await api('/auth/me')).user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const login = async ({ email, password, remember }) =>
  (await api('/auth/login', { method: 'POST', body: { email, password, remember } })).user;

export const register = async (values) =>
  (await api('/auth/register', { method: 'POST', body: values })).user;

export const logout = () => api('/auth/logout', { method: 'POST' });
