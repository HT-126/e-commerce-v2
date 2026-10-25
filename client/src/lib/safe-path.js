// Where to go after signing in: a path inside this site, or the home page. Never another site.
export const safeInternalPath = (value) =>
  typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
