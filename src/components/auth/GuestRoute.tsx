import { Navigate, Outlet } from 'react-router-dom';
import { авторизован } from '../../utils/auth';

export const GuestRoute = () => {
  if (авторизован()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
