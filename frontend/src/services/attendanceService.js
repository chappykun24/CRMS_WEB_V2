// Attendance Service - handles all attendance-related API calls
import api from '../utils/api.js';

class AttendanceService {
  // Get attendance for a specific class/section
  async getClassAttendance(sectionCourseId, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/attendance/class/${sectionCourseId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching class attendance:', error);
      throw error;
    }
  }

  // Get attendance sessions for a class
  async getSessions(sectionCourseId, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/attendance/sessions/${sectionCourseId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  }

  // Create a new attendance session
  async createSession(sessionData) {
    try {
      const response = await api.post('/attendance/sessions', sessionData);
      return response.data;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  // Mark attendance for a session
  async markAttendance(sessionId, attendanceRecords) {
    try {
      const response = await api.post('/attendance/mark', {
        session_id: sessionId,
        attendance_records: attendanceRecords
      });
      return response.data;
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  }

  // Get students enrolled in a section course
  async getStudents(sectionCourseId) {
    try {
      const response = await api.get(`/attendance/students/${sectionCourseId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  }

  // Get attendance statistics for a class
  async getAttendanceStats(sectionCourseId, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/attendance/stats/${sectionCourseId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      throw error;
    }
  }

  // Update attendance record
  async updateAttendance(attendanceId, status, remarks) {
    try {
      const response = await api.put(`/attendance/${attendanceId}`, {
        status,
        remarks
      });
      return response.data;
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw error;
    }
  }

  // Delete attendance session
  async deleteSession(sessionId) {
    try {
      const response = await api.delete(`/attendance/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting session:', error);
      
      // Extract proper error message from axios error response
      if (error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        throw new Error(errorMessage);
      } else if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to delete session. Please try again.');
      }
    }
  }

  // Get attendance summary for dashboard
  async getAttendanceSummary(facultyId, filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/attendance/summary/${facultyId}?${params}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
      throw error;
    }
  }

  // Export attendance data
  async exportAttendance(sectionCourseId, format = 'csv', filters = {}) {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/attendance/export/${sectionCourseId}?${params}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting attendance:', error);
      throw error;
    }
  }
}

export default new AttendanceService();
