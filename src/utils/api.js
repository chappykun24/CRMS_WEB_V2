import axios from 'axios'

// Create axios instance
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API endpoints
export const endpoints = {
  // Auth
  login: '/auth/login',
  logout: '/auth/logout',
  me: '/auth/me',
  
  // Users
  users: '/users',
  userProfile: (id) => `/users/${id}`,
  
  // Students
  students: '/students',
  studentProfile: (id) => `/students/${id}`,
  
  // Classes
  classes: '/classes',
  classStudents: (id) => `/classes/${id}/students`,
  
  // Attendance
  attendance: '/attendance',
  classAttendance: (classId) => `/attendance/class/${classId}`,
  
  // Assessments
  assessments: '/assessments',
  classAssessments: (classId) => `/assessments/class/${classId}`,
  
  // Grades
  grades: '/grades',
  studentGrades: (studentId) => `/grades/student/${studentId}`,
  
  // Analytics
  analytics: '/analytics',
  classAnalytics: (classId) => `/analytics/class/${classId}`,
}

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
  }
}

export default api 