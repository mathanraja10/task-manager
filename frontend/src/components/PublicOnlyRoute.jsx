import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingState from './LoadingState';

/**
 * Login/register pages. Once the user is signed in they are sent on to the
 * page that originally required login (set by ProtectedRoute), or the dashboard.
 */
export default function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Checking your session…" fullPage />;
  if (isAuthenticated) {
    return <Navigate to={location.state?.from?.pathname ?? '/dashboard'} replace />;
  }
  return <Outlet />;
}
