import { Navigate, useLocation } from 'react-router';
import { Button } from '@/components/ui/button';
import { useMe } from '../../hooks/use-auth.js';

// The guard of every admin page. This is only for looks: the API checks the role again on every request
// (`/api/admin` answers 403 to anyone else). A guest goes to sign in and comes back; a customer goes Home.
export default function RequireAdmin({ children }) {
  const location = useLocation();
  const { data: user, isPending, isError, refetch } = useMe();

  if (isPending) return <p role="status" className="p-6 text-muted-foreground">Loading...</p>;
  // A server or network failure is not "signed out": do not send a signed-in admin to the sign in page.
  if (isError) {
    return (
      <div role="alert" className="m-6 rounded-xl bg-card p-8 text-center">
        <p className="text-destructive">Could not check that you are signed in.</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
