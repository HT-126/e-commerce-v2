import { Badge } from '@/components/ui/badge';

// How an order status (or a product's Active / Hidden) looks. Plain words, the shadcn variants for color.
const STATUSES = {
  paid: { label: 'Paid', variant: 'outline' },
  shipped: { label: 'Shipped', variant: 'secondary' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  active: { label: 'Active', variant: 'default' },
  hidden: { label: 'Hidden', variant: 'secondary' },
};

export default function StatusBadge({ status }) {
  const { label, variant } = STATUSES[status] ?? { label: status, variant: 'outline' };
  return <Badge variant={variant}>{label}</Badge>;
}
