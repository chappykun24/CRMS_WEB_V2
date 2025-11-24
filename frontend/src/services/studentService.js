// Frontend student service - calls backend API
// The backend handles all database operations

class StudentService {
  // Register new student via backend API
  async registerStudent(studentData) {
    try {
      const response = await fetch('/api/students/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(studentData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Student registration failed');
      }
      
      return data;
      
    } catch (error) {
      console.error('Student registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get all students via backend API
  async getAllStudents() {
    try {
      const response = await fetch('/api/students');
      
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      
      const data = await response.json();
      // Server returns an array of students; support both array and { students: [] }
      const students = Array.isArray(data) ? data : (data.students || []);
      
      return {
        success: true,
        students
      };
      
    } catch (error) {
      console.error('Get students error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get student by ID via backend API
  async getStudentById(studentId) {
    try {
      const response = await fetch(`/api/students/${studentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch student');
      }
      
      const data = await response.json();
      
      return {
        success: true,
        student: data.student
      };
      
    } catch (error) {
      console.error('Get student error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Update student profile via backend API
  async updateStudentProfile(studentId, profileData) {
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Student profile update failed');
      }
      
      return data;
      
    } catch (error) {
      console.error('Student profile update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete student via backend API
  async deleteStudent(studentId) {
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Student deletion failed');
      }
      
      return data;
      
    } catch (error) {
      console.error('Delete student error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get student enrollments via backend API
  async getStudentEnrollments(studentId) {
    try {
      const response = await fetch(`/api/students/${studentId}/enrollments`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch student enrollments');
      }
      
      const data = await response.json();
      
      return {
        success: true,
        enrollments: data.enrollments || []
      };
      
    } catch (error) {
      console.error('Get student enrollments error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Enroll student in course via backend API
  async enrollStudentInCourse(studentId, courseData) {
    try {
      const response = await fetch(`/api/students/${studentId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Course enrollment failed');
      }
      
      return data;
      
    } catch (error) {
      console.error('Course enrollment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Import students from CSV file via backend API
  async importStudentsFromCSV(csvFile) {
    try {
      const formData = new FormData();
      formData.append('csv', csvFile);

      // Use API_BASE_URL for consistency with other services
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${API_BASE_URL}/students/import-csv`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'CSV import failed');
      }
      
      return data;
      
    } catch (error) {
      console.error('CSV import error:', error);
      return {
        success: false,
        error: error.message,
        successCount: 0,
        errorCount: 0,
        errors: [error.message]
      };
    }
  }
}

export default new StudentService();
