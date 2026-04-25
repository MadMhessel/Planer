import { Navigate, Outlet } from 'react-router-dom';
import { авторизован } from '../../utils/auth';

export const ProtectedRoute = () => {
  if (!авторизован()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
