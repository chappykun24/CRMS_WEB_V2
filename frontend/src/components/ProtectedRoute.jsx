import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  requiredDepartment = null,
  fallbackPath = '/login' 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  console.log('[ProtectedRoute] check', { isAuthenticated, isLoading, user, requiredRoles, requiredDepartment });

  const userHasAnyRole = (roles = []) => {
    if (!roles || roles.length === 0) return true;
    const role = String(user?.role_name || user?.role || '').toLowerCase().replace(/\s|_/g, '');
    return roles.some(r => String(r).toLowerCase().replace(/\s|_/g, '') === role);
  };

  const userHasDepartment = (department) => {
    if (!department) return true;
    const userDept = user?.department || user?.department_name || user?.departmentId || user?.department_id;
    if (!userDept) return false;
    return String(userDept).toLowerCase() === String(department).toLowerCase();
  };
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.warn('[ProtectedRoute] not authenticated, redirecting', { to: fallbackPath, from: location.pathname });
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !userHasAnyRole(requiredRoles)) {
    console.warn('[ProtectedRoute] missing required roles', { requiredRoles, userRoles: user?.roles || user?.role });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required roles: {requiredRoles.join(', ')}
          </p>
        </div>
      </div>
    );
  }

  // Check department requirements
  if (requiredDepartment && !userHasDepartment(requiredDepartment)) {
    console.warn('[ProtectedRoute] missing required department', { requiredDepartment });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this department's resources.
          </p>
        </div>
      </div>
    );
  }

  // User is authenticated and has required permissions
  return children;
};

// Higher-order component for role-based access
export const withRole = (WrappedComponent, requiredRoles) => {
  return (props) => (
    <ProtectedRoute requiredRoles={requiredRoles}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );
};

// Higher-order component for department-based access
export const withDepartment = (WrappedComponent, requiredDepartment) => {
  return (props) => (
    <ProtectedRoute requiredDepartment={requiredDepartment}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );
};

// Higher-order component for combined role and department access
export const withAccess = (WrappedComponent, { roles = [], department = null }) => {
  return (props) => (
    <ProtectedRoute requiredRoles={roles} requiredDepartment={department}>
      <WrappedComponent {...props} />
    </ProtectedRoute>
  );
};

export default ProtectedRoute;