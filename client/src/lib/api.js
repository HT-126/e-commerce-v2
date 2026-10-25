// Small fetch wrapper. Relative URLs keep the cookie same-origin (Vite proxies /api in dev).
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;

  const json = await response.json().catch(() => null);
  if (!response.ok) {
    const { message, code, details } = json?.error ?? {};
    throw new ApiError(response.status, code, message ?? 'Something went wrong', details);
  }
  return json.data;
}
