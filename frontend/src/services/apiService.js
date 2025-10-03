import axios from 'axios';

// API Configuration
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const safeParseJson = (value, fallback) => {
  try {
    if (value === undefined || value === null) return fallback;
    if (value === 'undefined' || value === 'null' || value === '') return fallback;
    return JSON.parse(value);
  } catch (_) {
    return fallback;
  }
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: isDevelopment,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const user = safeParseJson(localStorage.getItem('userData'), {});
    if (user.id) {
      config.headers['user-id'] = user.id;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Service Class
class ApiService {
  // Auth endpoints
  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  }

  async logout() {
    const response = await api.post('/auth/logout');
    return response.data;
  }

  async getProfile() {
    const response = await api.get('/auth/profile');
    return response.data;
  }

  async updateProfile(profileData) {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  }

  async changePassword(passwordData) {
    const response = await api.put('/auth/change-password', passwordData);
    return response.data;
  }

  // User endpoints
  async getUsers(params = {}) {
    const response = await api.get('/users', { params });
    return response.data;
  }

  async getUserById(id) {
    const response = await api.get(`/users/${id}`);
    return response.data;
  }

  async createUser(userData) {
    const response = await api.post('/users', userData);
    return response.data;
  }

  async updateUser(id, userData) {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  }

  async deleteUser(id) {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  }

  async approveUser(id, remarks = '') {
    const response = await api.put(`/users/${id}/approve`, { remarks });
    return response.data;
  }

  async rejectUser(id, remarks = '') {
    const response = await api.put(`/users/${id}/reject`, { remarks });
    return response.data;
  }

  async getPendingApprovals() {
    const response = await api.get('/users/approvals/pending');
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
export { api };
