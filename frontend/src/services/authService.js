// Frontend authentication service - calls backend API
import api, { endpoints } from '../utils/api.js';

class AuthService {
  // User login via backend API
  async login(email, password) {
    try {
      const { data } = await api.post(endpoints.login, { email, password });
      return data;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || error.message
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
  
  // Get user by ID via backend API
  async getUserById(userId) {
    try {
      const { data } = await api.get(`${endpoints.users}/${userId}/profile`);
      return { success: true, user: data.user };
    } catch (error) {
      console.error('Get user error:', error);
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
