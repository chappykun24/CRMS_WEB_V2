import axios from 'axios';

// API Configuration
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001/api'
  : (import.meta.env.VITE_API_BASE_URL || 'https://crms-backend-api.onrender.com/api');

// Request cache and deduplication
const requestCache = new Map();
const pendingRequests = new Map();

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

// Create axios instance with optimized settings
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Increased timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: isDevelopment,
  // Enable compression
  decompress: true,
});

// Request interceptor for caching and deduplication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    const user = JSON.parse(localStorage.getItem('userData') || '{}');
    if (user.id) {
      config.headers['user-id'] = user.id;
    }
    
    // Add cache control for GET requests
    if (config.method === 'get') {
      config.headers['Cache-Control'] = 'max-age=300'; // 5 minutes
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for caching and error handling
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = generateCacheKey(response.config);
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
        headers: response.headers
      });
      
      // Clean cache if it gets too large
      if (requestCache.size > MAX_CACHE_SIZE) {
        cleanCache();
      }
    }
    
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Generate cache key for requests
function generateCacheKey(config) {
  const { method, url, params, data } = config;
  return `${method}:${url}:${JSON.stringify(params)}:${JSON.stringify(data)}`;
}

// Clean old cache entries
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      requestCache.delete(key);
    }
  }
}

// Optimized API Service Class
class OptimizedApiService {
  constructor() {
    this.cache = requestCache;
    this.pendingRequests = pendingRequests;
  }

  // Generic request method with caching and deduplication
  async request(config, useCache = true) {
    const cacheKey = generateCacheKey(config);
    
    // Check cache first for GET requests
    if (useCache && config.method === 'get') {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log('📦 [API] Cache hit for:', config.url);
        return { data: cached.data };
      }
    }
    
    // Check if request is already pending (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      console.log('🔄 [API] Deduplicating request:', config.url);
      return this.pendingRequests.get(cacheKey);
    }
    
    // Create pending request promise
    const requestPromise = api(config).finally(() => {
      this.pendingRequests.delete(cacheKey);
    });
    
    this.pendingRequests.set(cacheKey, requestPromise);
    
    try {
      const response = await requestPromise;
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Optimized GET with caching
  async get(url, config = {}, useCache = true) {
    return this.request({ method: 'get', url, ...config }, useCache);
  }

  // POST without caching
  async post(url, data, config = {}) {
    return this.request({ method: 'post', url, data, ...config }, false);
  }

  // PUT without caching
  async put(url, data, config = {}) {
    return this.request({ method: 'put', url, data, ...config }, false);
  }

  // PATCH without caching
  async patch(url, data, config = {}) {
    return this.request({ method: 'patch', url, data, ...config }, false);
  }

  // DELETE without caching
  async delete(url, config = {}) {
    return this.request({ method: 'delete', url, ...config }, false);
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('🧹 [API] Cache cleared');
  }

  // Clear cache for specific pattern
  clearCachePattern(pattern) {
    for (const [key] of this.cache.entries()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
    console.log(`🧹 [API] Cache cleared for pattern: ${pattern}`);
  }

  // Auth endpoints
  async login(credentials) {
    const response = await this.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData) {
    const response = await this.post('/auth/register', userData);
    return response.data;
  }

  async logout() {
    const response = await this.post('/auth/logout');
    this.clearCache(); // Clear cache on logout
    return response.data;
  }

  async getProfile() {
    const response = await this.get('/auth/profile');
    return response.data;
  }

  async updateProfile(profileData) {
    const response = await this.put('/auth/profile', profileData);
    this.clearCachePattern('/auth/profile'); // Clear profile cache
    return response.data;
  }

  async changePassword(passwordData) {
    const response = await this.put('/auth/change-password', passwordData);
    return response.data;
  }

  // User endpoints with caching
  async getUsers(params = {}) {
    const response = await this.get('/users', { params });
    return response.data;
  }

  async getUserById(id) {
    const response = await this.get(`/users/${id}`);
    return response.data;
  }

  async createUser(userData) {
    const response = await this.post('/users', userData);
    this.clearCachePattern('/users'); // Clear users cache
    return response.data;
  }

  async updateUser(id, userData) {
    const response = await this.put(`/users/${id}`, userData);
    this.clearCachePattern('/users'); // Clear users cache
    return response.data;
  }

  async deleteUser(id) {
    const response = await this.delete(`/users/${id}`);
    this.clearCachePattern('/users'); // Clear users cache
    return response.data;
  }

  async approveUser(id, remarks = '') {
    const response = await this.patch(`/users/${id}/approve`, { remarks });
    this.clearCachePattern('/users'); // Clear users cache
    return response.data;
  }

  async rejectUser(id, remarks = '') {
    const response = await this.patch(`/users/${id}/reject`, { remarks });
    this.clearCachePattern('/users'); // Clear users cache
    return response.data;
  }

  async getPendingApprovals() {
    const response = await this.get('/users/approvals/pending');
    return response.data;
  }

  // Department endpoints with caching
  async getDepartments() {
    const response = await this.get('/departments');
    return response.data;
  }

  async getDepartmentById(id) {
    const response = await this.get(`/departments/${id}`);
    return response.data;
  }

  // Health check
  async healthCheck() {
    const response = await this.get('/health');
    return response.data;
  }

  // Batch operations for better performance
  async batchGetUsers(userIds) {
    const promises = userIds.map(id => this.getUserById(id));
    return Promise.all(promises);
  }

  // Paginated requests
  async getUsersPaginated(page = 1, limit = 10, filters = {}) {
    const params = {
      page,
      limit,
      ...filters
    };
    const response = await this.get('/users', { params });
    return response.data;
  }
}

// Create singleton instance
const optimizedApiService = new OptimizedApiService();

export default optimizedApiService;
export { api };
