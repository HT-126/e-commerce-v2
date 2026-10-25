import { Navigate, useLocation } from 'react-router';
import { useMe } from '../hooks/use-auth.js';

// For pages that belong to a signed-in customer. A guest is sent to sign in and comes back afterwards.
export default function RequireUser({ children }) {
  const location = useLocation();
  const { data: user, isPending } = useMe();

  if (isPending) return <p role="status" className="text-ink-soft">Loading...</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  return children;
}
