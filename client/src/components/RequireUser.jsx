import { Navigate, useLocation } from 'react-router';
import { useMe } from '../hooks/use-auth.js';
import Button from './Button.jsx';

// For pages that belong to a signed-in customer. A guest is sent to sign in and comes back afterwards.
export default function RequireUser({ children }) {
  const location = useLocation();
  const { data: user, isPending, isError, refetch } = useMe();

  if (isPending) return <p role="status" className="text-ink-soft">Loading...</p>;
  // A server or network failure is not "signed out": do not send a signed-in user to the sign in page.
  if (isError) {
    return (
      <div role="alert" className="rounded-[28px] bg-card p-8 text-center">
        <p className="text-error">Could not check that you are signed in.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  return children;
}
