import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/UnifiedAuthContext.jsx';

const ProtectedRoute = ({ 
  children, 
  requiredRoles = [], 
  requiredDepartment = null,
  fallbackPath = '/login' 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hasCheckedAuth = useRef(false);
  const lastAuthCheck = useRef(Date.now());
  
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
  // Enhanced authentication validation with browser history protection
  useEffect(() => {
    const validateAuthentication = () => {
      // Check if we have valid authentication data
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (!token || !userData) {
        console.log('[ProtectedRoute] No valid auth data found, forcing logout');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        navigate('/login', { replace: true });
        return;
      }

      // Parse and validate user data
      try {
        const parsedUserData = JSON.parse(userData);
        if (!parsedUserData || !parsedUserData.user_id && !parsedUserData.id) {
          console.log('[ProtectedRoute] Invalid user data, forcing logout');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          navigate('/login', { replace: true });
          return;
        }
      } catch (error) {
        console.log('[ProtectedRoute] Failed to parse user data, forcing logout');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        navigate('/login', { replace: true });
        return;
      }

      // Update last auth check time
      lastAuthCheck.current = Date.now();
      hasCheckedAuth.current = true;
    };

    // Only validate if not loading and haven't checked recently
    if (!isLoading && (Date.now() - lastAuthCheck.current > 1000)) {
      validateAuthentication();
    }
  }, [isLoading, navigate]);

  // Prevent browser back navigation bypass
  useEffect(() => {
    const handlePopState = (event) => {
      console.log('[ProtectedRoute] Popstate detected, validating auth');
      
      // Re-validate authentication on browser navigation
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (!token || !userData) {
        console.log('[ProtectedRoute] Auth validation failed on popstate, redirecting to login');
        event.preventDefault();
        navigate('/login', { replace: true });
        return;
      }

      // Check if user data is valid
      try {
        const parsedUserData = JSON.parse(userData);
        if (!parsedUserData || !parsedUserData.user_id && !parsedUserData.id) {
          console.log('[ProtectedRoute] Invalid user data on popstate, redirecting to login');
          event.preventDefault();
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          navigate('/login', { replace: true });
          return;
        }
      } catch (error) {
        console.log('[ProtectedRoute] Failed to parse user data on popstate, redirecting to login');
        event.preventDefault();
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        navigate('/login', { replace: true });
        return;
      }
    };

    // Add popstate listener for browser navigation
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

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