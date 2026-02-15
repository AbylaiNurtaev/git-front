import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: UserRole;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, currentUser } = useStore();
  const location = useLocation();

  if (!isAuthenticated || !currentUser) {
    const returnUrl = location.pathname + location.search;
    const to = returnUrl ? `/auth?redirect=${encodeURIComponent(returnUrl)}` : '/auth';
    return <Navigate to={to} replace state={{ from: location }} />;
  }

  if (currentUser.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
