import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Protect route - requires authentication
export const ProtectedRoute = ({ roles }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    // Prevent infinite redirect loop - only redirect if user's role doesn't match
    const dashboardMap = { superadmin: '/superadmin', admin: '/admin', hr: '/hr', employee: '/employee' };
    const targetDashboard = dashboardMap[user.role] || '/login';
    // Add a small delay to prevent rapid re-renders
    return <Navigate to={targetDashboard} replace />;
  }

  return <Outlet />;
};

// Redirect logged-in users away from auth pages
export const PublicRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingSpinner fullScreen />;
  if (user) {
    const dashboardMap = { superadmin: '/superadmin', admin: '/admin', hr: '/hr', employee: '/employee' };
    return <Navigate to={dashboardMap[user.role] || '/login'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
