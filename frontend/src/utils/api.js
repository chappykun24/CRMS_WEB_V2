import axios from 'axios';

// API Configuration - always use Render backend
// Export this so other files can use it for fetch() calls
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://crms-backend-api.onrender.com/api';

// Log the API base URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔗 [API] Base URL:', API_BASE_URL);
  console.log('🔗 [API] VITE_API_BASE_URL env:', import.meta.env.VITE_API_BASE_URL || '(not set, using fallback)');
}

// Helpers
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
  timeout: 60000, // Allow longer time for cold-started backends
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Disable credentials for cross-origin requests
});

// Create a separate axios instance for user profile requests with shorter timeout
// This prevents background refresh from blocking for too long
const profileApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds - sufficient for user profile requests
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor for main API
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add user ID to headers for department access control (safe parse)
    const user = safeParseJson(localStorage.getItem('userData'), {});
    if (user.id) {
      config.headers['user-id'] = user.id;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor for profile API (same as main API)
profileApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add user ID to headers for department access control (safe parse)
    const user = safeParseJson(localStorage.getItem('userData'), {});
    if (user.id) {
      config.headers['user-id'] = user.id;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for profile API (no retry, fail fast)
profileApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors
    if (error.response?.status === 401) {
      console.warn('[ProfileAPI] 401 Unauthorized - token may be invalid or expired');
    }
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Simple one-time retry on timeout (helps Render cold starts)
    const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
    const config = error.config || {};
    if (isTimeout && !config.__retried) {
      config.__retried = true;
      return api.request(config);
    }
    
    // Handle 401 errors more gracefully
    if (error.response?.status === 401) {
      console.warn('[API] 401 Unauthorized - token may be invalid or expired');
      // Don't automatically clear tokens here - let the auth context handle it
    }
    
    // Do not force a global redirect on 401 here to avoid auth flicker.
    // Let callers decide how to handle unauthorized responses.
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
  userApprove: (id) => `/users/${id}/approve`,
  userReject: (id) => `/users/${id}/reject`,

  // Role endpoints
  roles: '/roles',
  role: (id) => `/roles/${id}`,
  
  // Department endpoints
  departments: '/departments',
  department: (id) => `/departments/${id}`,
  
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
  
  // Catalog endpoints
  programs: '/catalog/programs',
  specializations: '/catalog/program-specializations',
  terms: '/catalog/terms',
  catalogCourses: '/catalog/courses',
};

// Simple API helper methods (API only)
export const enhancedApi = {
  // User management methods
  async getUsers(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.role_id) queryParams.append('role_id', params.role_id);
    if (params.department_id) queryParams.append('department_id', params.department_id);
    if (params.search) queryParams.append('search', params.search);
    if (params.status) queryParams.append('status', params.status);
    if (params.pending_only) queryParams.append('pending_only', params.pending_only);
    
    const url = queryParams.toString() 
      ? `${endpoints.users}?${queryParams.toString()}`
      : endpoints.users;
    
    const response = await api.get(url);
    return response.data;
  },

  async getUserById(id) {
    const response = await api.get(endpoints.user(id));
    return response.data;
  },

  async createUser(userData) {
    const response = await api.post(endpoints.users, userData);
    return response.data;
  },

  async updateUser(id, userData) {
    const response = await api.put(endpoints.user(id), userData);
    return response.data;
  },

  async deleteUser(id) {
    const response = await api.delete(endpoints.user(id));
    return response.data;
  },

  async approveUser(id) {
    const response = await api.patch(endpoints.userApprove(id));
    return response.data;
  },

  async rejectUser(id) {
    const response = await api.patch(endpoints.userReject(id));
    return response.data;
  },

  // Role and department methods
  async getRoles() {
    const response = await api.get(endpoints.roles);
    return response.data;
  },

  async getDepartments() {
    const response = await api.get(endpoints.departments);
    return response.data;
  },

  async getDepartmentById(id) {
    const response = await api.get(endpoints.department(id));
    return response.data;
  },

  async createDepartment(departmentData) {
    const response = await api.post(endpoints.departments, departmentData);
    return response.data;
  },

  async updateDepartment(id, departmentData) {
    const response = await api.put(endpoints.department(id), departmentData);
    return response.data;
  },

  async deleteDepartment(id) {
    const response = await api.delete(endpoints.department(id));
    return response.data;
  },

  // School terms
  async getSchoolTerms() {
    const response = await api.get('/school-terms');
    return response.data;
  },

  // Catalog methods
  async getPrograms() {
    const response = await api.get(endpoints.programs);
    return response.data;
  },

  async getSpecializations(programId) {
    const url = programId ? `${endpoints.specializations}?programId=${programId}` : endpoints.specializations;
    const response = await api.get(url);
    return response.data;
  },

  async getTerms() {
    const response = await api.get(endpoints.terms);
    return response.data;
  },

  async getCourses(filters = {}) {
    const params = new URLSearchParams();
    if (filters.programId) params.append('programId', filters.programId);
    if (filters.specializationId) params.append('specializationId', filters.specializationId);
    if (filters.termId) params.append('termId', filters.termId);
    const response = await api.get(`${endpoints.catalogCourses}?${params.toString()}`);
    return response.data;
  },

  // Create operations
  async createProgram(programData) {
    try {
      const response = await api.post(endpoints.programs, programData);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to create program: ${error.message}`);
    }
  },

  async createSpecialization(specializationData) {
    try {
      const response = await api.post(endpoints.specializations, specializationData);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to create specialization: ${error.message}`);
    }
  },

  async createCourse(courseData) {
    try {
      const response = await api.post(endpoints.catalogCourses, courseData);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to create course: ${error.message}`);
    }
  },

  // Update operations
  async updateProgram(programId, programData) {
    try {
      const response = await api.put(`${endpoints.programs}/${programId}`, programData);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to update program: ${error.message}`);
    }
  },

  async updateSpecialization(specializationId, specializationData) {
    try {
      const response = await api.put(`${endpoints.specializations}/${specializationId}`, specializationData);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to update specialization: ${error.message}`);
    }
  },

  async updateCourse(courseId, courseData) {
    try {
      const response = await api.put(`${endpoints.catalogCourses}/${courseId}`, courseData);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to update course: ${error.message}`);
    }
  },

  // Delete operations
  async deleteProgram(programId) {
    try {
      await api.delete(`${endpoints.programs}/${programId}`);
      return true;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to delete program: ${error.message}`);
    }
  },

  async deleteSpecialization(specializationId) {
    try {
      await api.delete(`${endpoints.specializations}/${specializationId}`);
      return true;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to delete specialization: ${error.message}`);
    }
  },

  async deleteCourse(courseId) {
    try {
      await api.delete(`${endpoints.catalogCourses}/${courseId}`);
      return true;
    } catch (error) {
      console.error('API failed:', error.message);
      
      // Check if we have a detailed error response from the backend
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error && errorData.message) {
          // Use the detailed backend error message
          throw new Error(`${errorData.error}: ${errorData.message}`);
        }
      }
      
      throw new Error(`Failed to delete course: ${error.message}`);
    }
  }
}

// Export the main API instance
// Export both API instances
export { profileApi };
export default api; 