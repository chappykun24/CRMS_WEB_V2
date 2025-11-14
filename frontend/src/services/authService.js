// Frontend authentication service - calls backend API
import api, { endpoints } from '../utils/api.js';

class AuthService {
  // User login via backend API - Optimized for performance
  async login(email, password) {
    const startTime = performance.now();
    const isDev = process.env.NODE_ENV === 'development';
    
    try {
      if (isDev) {
        console.log('[AuthService] Login attempt:', email?.substring(0, 3) + '***');
      }
      
      // Single optimized API call
      const { data } = await api.post(endpoints.login, { email, password });
      
      // Handle successful login with user data
      if (data?.success && data?.data?.user) {
        if (isDev) {
          const duration = Math.round(performance.now() - startTime);
          console.log(`✅ [AuthService] Login successful (${duration}ms)`);
        }
        return {
          success: true,
          user: data.data.user,
          token: data.data.token
        };
      }
      
      // Handle successful login but no user data
      if (data?.success && !data?.data?.user) {
        if (isDev) {
          console.warn('[AuthService] Login successful but no user data');
        }
        return { 
          success: false, 
          error: 'Login successful but no user data received from server' 
        };
      }
      
      // Handle login failure
      return { 
        success: false, 
        error: data?.message || 'Login failed' 
      };
    } catch (error) {
      if (isDev) {
        console.error('[AuthService] Login error:', error.message);
      }
      
      // Handle timeout errors
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        return {
          success: false,
          error: 'Connection timeout. The backend server may not be running or is taking too long to respond.'
        };
      }
      
      // Handle network errors
      if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        return {
          success: false,
          error: 'Unable to connect to server. Please check your internet connection.'
        };
      }
      
      // Handle server errors
      if (error.response?.status >= 500) {
        return {
          success: false,
          error: 'Server error. Please try again later.'
        };
      }
      
      // Handle client errors
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }
  
  // Create new user via backend API
  async createUser(userData) {
    try {
      const { data } = await api.post(endpoints.register, userData);
      return data;
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
  
  // Get current user profile via backend API
  async getCurrentUserProfile() {
    try {
      const { data } = await api.get('/auth/profile');
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Get current user profile error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Get user by ID via backend API
  async getUserById(userId) {
    try {
      const { data } = await api.get(`${endpoints.users}/${userId}/profile`);
      return { success: true, user: data.user };
    } catch (error) {
      // Handle network errors (CORS, timeout, connection refused, etc.)
      if (!error.response) {
        // Network error - server might be down or unreachable
        console.error('Get user error (network):', error.message);
        return {
          success: false,
          error: 'Network error - unable to connect to server. Please try again later.'
        };
      }
      
      // Handle HTTP errors
      console.error('Get user error:', error.response?.status, error.response?.data?.error || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }
  
  // Update user profile via backend API
  async updateProfile(userId, profileData) {
    try {
      const { data } = await api.put(`${endpoints.users}/${userId}/profile`, profileData);
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Get departments
  async getDepartments() {
    try {
      const { data } = await api.get('/departments');
      return { success: true, departments: data.data };
    } catch (error) {
      console.error('Get departments error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Get roles
  async getRoles() {
    try {
      const { data } = await api.get('/roles');
      return { success: true, roles: data.data };
    } catch (error) {
      console.error('Get roles error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  // Test backend connection
  async testConnection() {
    try {
      const { data } = await api.get('/health');
      return { success: true, message: data.message };
    } catch (error) {
      console.error('Connection test error:', error);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }
}

export default new AuthService();
