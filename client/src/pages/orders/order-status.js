// The statuses of an order (business-rules.md: Orders), as the shopper reads them.
const LABELS = { paid: 'Paid', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

export const statusLabel = (status) => LABELS[status] ?? status;
