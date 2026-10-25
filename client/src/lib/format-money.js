const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Money is stored as integer cents. Shown as $12.34.
export const formatMoney = (cents) => usd.format(cents / 100);
