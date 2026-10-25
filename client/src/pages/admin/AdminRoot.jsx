import AdminLayout from '@/components/admin/AdminLayout';
import RequireAdmin from '@/components/admin/RequireAdmin';

// The one lazy route that holds every admin page, so none of the admin code is part of the shop's first load.
export default function AdminRoot() {
  return (
    <RequireAdmin>
      <AdminLayout />
    </RequireAdmin>
  );
}
