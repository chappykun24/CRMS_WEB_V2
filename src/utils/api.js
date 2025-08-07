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

export default api 