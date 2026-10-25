const date = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' });

// Dates come from the API as ISO strings. Shown as "Oct 25, 2026".
export const formatDate = (iso) => date.format(new Date(iso));
