import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore.js';

export default function ProtectedRoute({ role }) {
  const session = useAuthStore((s) => s.session);
  if (!session || session.role !== role) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
