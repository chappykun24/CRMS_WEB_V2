import axios from 'axios';

// API Configuration - supports both proxy and direct connection
const isDevelopment = import.meta.env.DEV;
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001/api'  // Local backend in development
  : (import.meta.env.VITE_API_BASE_URL || 'https://your-backend-url.onrender.com/api');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: isDevelopment, // Enable credentials in development
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add user ID to headers for department access control
    const user = JSON.parse(localStorage.getItem('userData') || '{}');
    if (user.id) {
      config.headers['user-id'] = user.id;
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
  programs: '/programs',
  specializations: '/program-specializations',
  terms: '/terms',
  catalogCourses: '/courses',
};

// Database service integration
export const dbService = {
  // Test database connection
  async testConnection() {
    try {
      const { testConnection } = await import('../config/database.js');
      return await testConnection();
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  },

  // Get database health status
  async getHealthStatus() {
    try {
      const { healthCheck } = await import('../config/database.js');
      return await healthCheck();
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'unhealthy', error: error.message };
    }
  }
}

// Enhanced API methods with database fallback
export const enhancedApi = {
  // User operations
  async getUsers() {
    try {
      // Try API first
      const response = await api.get(endpoints.users);
      return response.data;
    } catch (error) {
      console.log('API failed, trying database...');
      try {
        const { userService } = await import('../services/databaseService.js');
        return await userService.getAllUsers();
      } catch (dbError) {
        throw new Error(`Both API and database failed: ${error.message}, ${dbError.message}`);
      }
    }
  },

  // Student operations
  async getStudents() {
    try {
      const response = await api.get(endpoints.students);
      return response.data;
    } catch (error) {
      console.log('API failed, trying database...');
      try {
        const { studentService } = await import('../services/databaseService.js');
        return await studentService.getAllStudents();
      } catch (dbError) {
        throw new Error(`Both API and database failed: ${error.message}, ${dbError.message}`);
      }
    }
  },

  // Class operations
  async getClasses() {
    try {
      const response = await api.get(endpoints.classes);
      return response.data;
    } catch (error) {
      console.log('API failed, trying database...');
      try {
        const { classService } = await import('../services/databaseService.js');
        return await classService.getAllClasses();
      } catch (dbError) {
        throw new Error(`Both API and database failed: ${error.message}, ${dbError.message}`);
      }
    }
  },

  // Attendance operations
  async getClassAttendance(classId, date) {
    try {
      const response = await api.get(`${endpoints.classAttendance(classId)}?date=${date}`);
      return response.data;
    } catch (error) {
      console.log('API failed, trying database...');
      try {
        const { attendanceService } = await import('../services/databaseService.js');
        return await attendanceService.getClassAttendance(classId, date);
      } catch (dbError) {
        throw new Error(`Both API and database failed: ${error.message}, ${dbError.message}`);
      }
    }
  },

  // Assessment operations
  async getClassAssessments(classId) {
    try {
      const response = await api.get(endpoints.classAssessments(classId));
      return response.data;
    } catch (error) {
      console.log('API failed, trying database...');
      try {
        const { assessmentService } = await import('../services/databaseService.js');
        return await assessmentService.getClassAssessments(classId);
      } catch (dbError) {
        throw new Error(`Both API and database failed: ${error.message}, ${dbError.message}`);
      }
    }
  },

  // Grade operations
  async getStudentGrades(studentId, classId) {
    try {
      const response = await api.get(`${endpoints.studentGrades(studentId)}?classId=${classId}`);
      return response.data;
    } catch (error) {
      console.log('API failed, trying database...');
      try {
        const { gradeService } = await import('../services/databaseService.js');
        return await gradeService.getStudentGrades(studentId, classId);
      } catch (dbError) {
        throw new Error(`Both API and database failed: ${error.message}, ${dbError.message}`);
      }
    }
  },

  // Analytics operations
  async getClassAnalytics(classId) {
    try {
      const response = await api.get(endpoints.classAnalytics(classId));
      return response.data;
    } catch (error) {
      console.log('API failed, trying database...');
      try {
        const { analyticsService } = await import('../services/databaseService.js');
        return await analyticsService.getClassAnalytics(classId);
      } catch (dbError) {
        throw new Error(`Both API and database failed: ${error.message}, ${dbError.message}`);
      }
    }
  },

  // Catalog operations backed by database
  async getPrograms() {
    try {
      const response = await api.get(endpoints.programs);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      throw new Error(`Failed to fetch programs: ${error.message}`);
    }
  },

  async getSpecializations(programId) {
    try {
      const url = programId ? `${endpoints.specializations}?programId=${programId}` : endpoints.specializations;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      throw new Error(`Failed to fetch specializations: ${error.message}`);
    }
  },

  async getTerms() {
    try {
      const response = await api.get(endpoints.terms);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      throw new Error(`Failed to fetch terms: ${error.message}`);
    }
  },

  async getCourses(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.programId) params.append('programId', filters.programId);
      if (filters.specializationId) params.append('specializationId', filters.specializationId);
      if (filters.termId) params.append('termId', filters.termId);
      const response = await api.get(`${endpoints.catalogCourses}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('API failed:', error.message);
      throw new Error(`Failed to fetch courses: ${error.message}`);
    }
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
export default api; 