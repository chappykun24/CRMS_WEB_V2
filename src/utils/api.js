import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const endpoints = {
  // Auth endpoints
  login: '/auth/login',
  register: '/auth/register',
  logout: '/auth/logout',
  refresh: '/auth/refresh',
  
  // User endpoints
  users: '/users',
  user: (id) => `/users/${id}`,
  userProfile: (id) => `/users/${id}/profile`,
  
  // Student endpoints
  students: '/students',
  student: (id) => `/students/${id}`,
  studentClasses: (id) => `/students/${id}/classes`,
  
  // Class endpoints
  classes: '/classes',
  class: (id) => `/classes/${id}`,
  classStudents: (id) => `/classes/${id}/students`,
  classAttendance: (id) => `/classes/${id}/attendance`,
  classAssessments: (id) => `/classes/${id}/assessments`,
  classGrades: (id) => `/classes/${id}/grades`,
  
  // Faculty endpoints
  faculty: '/faculty',
  facultyClasses: (id) => `/faculty/${id}/classes`,
  
  // Analytics endpoints
  analytics: '/analytics',
  attendanceStats: '/analytics/attendance',
  gradeStats: '/analytics/grades',
  performanceStats: '/analytics/performance',
};

// Basic API methods
export const basicApi = {
  // GET request
  async get(url, config = {}) {
    return api.get(url, config);
  },
  
  // POST request
  async post(url, data = {}, config = {}) {
    return api.post(url, data, config);
  },
  
  // PUT request
  async put(url, data = {}, config = {}) {
    return api.put(url, data, config);
  },
  
  // DELETE request
  async delete(url, config = {}) {
    return api.delete(url, config);
  },
  
  // PATCH request
  async patch(url, data = {}, config = {}) {
    return api.patch(url, data, config);
  }
};

// Enhanced API methods (browser-compatible)
export const enhancedApi = {
  // User operations
  async getUsers() {
    try {
      const response = await api.get(endpoints.users);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  },

  // Student operations
  async getStudents() {
    try {
      const response = await api.get(endpoints.students);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch students:', error);
      throw new Error(`Failed to fetch students: ${error.message}`);
    }
  },

  // Class operations
  async getClasses() {
    try {
      const response = await api.get(endpoints.classes);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }
  },

  // Attendance operations
  async getClassAttendance(classId, date) {
    try {
      const response = await api.get(`${endpoints.classAttendance(classId)}?date=${date}`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }
  },

  // Assessment operations
  async getClassAssessments(classId) {
    try {
      const response = await api.get(endpoints.classAssessments(classId));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
      throw new Error(`Failed to fetch assessments: ${error.message}`);
    }
  },

  // Grade operations
  async getClassGrades(classId) {
    try {
      const response = await api.get(endpoints.classGrades(classId));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch grades:', error);
      throw new Error(`Failed to fetch grades: ${error.message}`);
    }
  },

  // Analytics operations
  async getAnalytics() {
    try {
      const response = await api.get(endpoints.analytics);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  },

  // Attendance statistics
  async getAttendanceStats() {
    try {
      const response = await api.get(endpoints.attendanceStats);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch attendance stats:', error);
      throw new Error(`Failed to fetch attendance stats: ${error.message}`);
    }
  },

  // Grade statistics
  async getGradeStats() {
    try {
      const response = await api.get(endpoints.gradeStats);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch grade stats:', error);
      throw new Error(`Failed to fetch grade stats: ${error.message}`);
    }
  },

  // Performance statistics
  async getPerformanceStats() {
    try {
      const response = await api.get(endpoints.performanceStats);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch performance stats:', error);
      throw new Error(`Failed to fetch performance stats: ${error.message}`);
    }
  }
};

// Export the main API instance
export default api; 