import { NavLink, Outlet, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { useLogout, useMe } from '../../hooks/use-auth.js';

const MENU = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/reviews', label: 'Reviews' },
];

const linkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm whitespace-nowrap hover:bg-white/10 ${isActive ? 'bg-white/15 font-medium' : ''}`;

// The owner's area: a menu on the left (a row on a phone), a top bar with the name and Sign out, the page on
// the right. Plain Tailwind; the buttons, tables and toasts inside are shadcn/ui.
export default function AdminLayout() {
  const navigate = useNavigate();
  const { data: user } = useMe();
  const logout = useLogout();

  async function signOut() {
    try {
      await logout.mutateAsync();
      navigate('/');
    } catch {
      // Still signed in: the button works again and the owner can try once more.
    }
  }

  return (
    <div className="min-h-screen bg-page text-ink md:flex">
      <aside className="bg-footer text-on-primary md:w-56 md:shrink-0">
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto p-3 md:flex-col md:p-4">
          <p className="hidden px-3 pb-3 font-serif text-2xl md:block">Lumière</p>
          {MENU.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/" end className="rounded-md px-3 py-2 text-sm whitespace-nowrap text-accent-light hover:bg-white/10 md:mt-6">
            Back to store
          </NavLink>
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-white px-6 py-3">
          <p className="text-sm font-medium">Admin</p>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-muted-foreground">
                {user.firstName} {user.lastName}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={signOut} disabled={logout.isPending}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
