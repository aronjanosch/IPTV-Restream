import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedComponentProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireAuth?: boolean;
  fallback?: ReactNode;
}

const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  requireAdmin = false,
  requireAuth = false,
  fallback = null
}) => {
  const { user, authenticated, loading } = useAuth();

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (requireAuth && !authenticated) {
    return <>{fallback}</>;
  }

  if (requireAdmin && (!authenticated || user?.role !== 'admin')) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default ProtectedComponent;