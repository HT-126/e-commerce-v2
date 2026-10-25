// Browsers read a backslash like a slash, and ignore tabs and line breaks inside an address, so "/\evil.example"
// and "/<tab>/evil.example" would mean "//evil.example", another site.
const isUnsafeCharacter = (character) => {
  const code = character.charCodeAt(0);
  return character === '\\' || code < 32 || code === 127;
};

// Where to go after signing in: a path inside this site, or the home page. Never another site.
export const safeInternalPath = (value) =>
  typeof value === 'string' &&
  value.startsWith('/') &&
  !value.startsWith('//') &&
  ![...value].some(isUnsafeCharacter)
    ? value
    : '/';
