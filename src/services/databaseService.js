import { query, getClient } from '../config/database.js';

// User Management
export const userService = {
  // Get all users
  async getAllUsers() {
    try {
      const result = await query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  },

  // Get user by ID
  async getUserById(id) {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  },

  // Get user by email
  async getUserByEmail(email) {
    try {
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch user by email: ${error.message}`);
    }
  },

  // Create new user
  async createUser(userData) {
    try {
      const { email, password, first_name, last_name, role, department } = userData;
      const result = await query(
        'INSERT INTO users (email, password, first_name, last_name, role, department) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [email, password, first_name, last_name, role, department]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  },

  // Update user
  async updateUser(id, userData) {
    try {
      const { first_name, last_name, role, department } = userData;
      const result = await query(
        'UPDATE users SET first_name = $1, last_name = $2, role = $3, department = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [first_name, last_name, role, department, id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  },

  // Delete user
  async deleteUser(id) {
    try {
      const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }
};

// Student Management
export const studentService = {
  // Get all students
  async getAllStudents() {
    try {
      const result = await query('SELECT * FROM students ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }
  },

  // Get student by ID
  async getStudentById(id) {
    try {
      const result = await query('SELECT * FROM students WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch student: ${error.message}`);
    }
  },

  // Create new student
  async createStudent(studentData) {
    try {
      const { student_id, first_name, last_name, email, department, year_level } = studentData;
      const result = await query(
        'INSERT INTO students (student_id, first_name, last_name, email, department, year_level) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [student_id, first_name, last_name, email, department, year_level]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create student: ${error.message}`);
    }
  },

  // Update student
  async updateStudent(id, studentData) {
    try {
      const { first_name, last_name, email, department, year_level } = studentData;
      const result = await query(
        'UPDATE students SET first_name = $1, last_name = $2, email = $3, department = $4, year_level = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
        [first_name, last_name, email, department, year_level, id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to update student: ${error.message}`);
    }
  }
};

// Class Management
export const classService = {
  // Get all classes
  async getAllClasses() {
    try {
      const result = await query(`
        SELECT c.*, u.first_name as faculty_first_name, u.last_name as faculty_last_name 
        FROM classes c 
        LEFT JOIN users u ON c.faculty_id = u.id 
        ORDER BY c.created_at DESC
      `);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }
  },

  // Get class by ID
  async getClassById(id) {
    try {
      const result = await query(`
        SELECT c.*, u.first_name as faculty_first_name, u.last_name as faculty_last_name 
        FROM classes c 
        LEFT JOIN users u ON c.faculty_id = u.id 
        WHERE c.id = $1
      `, [id]);
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch class: ${error.message}`);
    }
  },

  // Create new class
  async createClass(classData) {
    try {
      const { class_code, class_name, description, faculty_id, department, units } = classData;
      const result = await query(
        'INSERT INTO classes (class_code, class_name, description, faculty_id, department, units) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [class_code, class_name, description, faculty_id, department, units]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create class: ${error.message}`);
    }
  }
};

// Attendance Management
export const attendanceService = {
  // Get class attendance
  async getClassAttendance(classId, date) {
    try {
      const result = await query(`
        SELECT a.*, s.first_name, s.last_name, s.student_id 
        FROM attendance a 
        JOIN students s ON a.student_id = s.id 
        WHERE a.class_id = $1 AND DATE(a.date) = $2
        ORDER BY s.last_name, s.first_name
      `, [classId, date]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch attendance: ${error.message}`);
    }
  },

  // Mark attendance
  async markAttendance(attendanceData) {
    try {
      const { class_id, student_id, date, status, remarks } = attendanceData;
      const result = await query(
        'INSERT INTO attendance (class_id, student_id, date, status, remarks) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (class_id, student_id, date) DO UPDATE SET status = $4, remarks = $5, updated_at = NOW() RETURNING *',
        [class_id, student_id, date, status, remarks]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to mark attendance: ${error.message}`);
    }
  }
};

// Assessment Management
export const assessmentService = {
  // Get class assessments
  async getClassAssessments(classId) {
    try {
      const result = await query(`
        SELECT a.*, at.name as assessment_type_name 
        FROM assessments a 
        LEFT JOIN assessment_types at ON a.assessment_type_id = at.id 
        WHERE a.class_id = $1 
        ORDER BY a.due_date DESC
      `, [classId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch assessments: ${error.message}`);
    }
  },

  // Create assessment
  async createAssessment(assessmentData) {
    try {
      const { class_id, assessment_type_id, name, description, total_points, due_date } = assessmentData;
      const result = await query(
        'INSERT INTO assessments (class_id, assessment_type_id, name, description, total_points, due_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [class_id, assessment_type_id, name, description, total_points, due_date]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create assessment: ${error.message}`);
    }
  }
};

// Grade Management
export const gradeService = {
  // Get student grades
  async getStudentGrades(studentId, classId) {
    try {
      const result = await query(`
        SELECT g.*, a.name as assessment_name, a.total_points 
        FROM grades g 
        JOIN assessments a ON g.assessment_id = a.id 
        WHERE g.student_id = $1 AND g.class_id = $2 
        ORDER BY a.due_date DESC
      `, [studentId, classId]);
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch grades: ${error.message}`);
    }
  },

  // Submit grade
  async submitGrade(gradeData) {
    try {
      const { student_id, assessment_id, class_id, score, remarks } = gradeData;
      const result = await query(
        'INSERT INTO grades (student_id, assessment_id, class_id, score, remarks) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (student_id, assessment_id) DO UPDATE SET score = $4, remarks = $5, updated_at = NOW() RETURNING *',
        [student_id, assessment_id, class_id, score, remarks]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to submit grade: ${error.message}`);
    }
  }
};

// Analytics Service
export const analyticsService = {
  // Get class analytics
  async getClassAnalytics(classId) {
    try {
      const client = await getClient();
      
      try {
        // Get attendance statistics
        const attendanceStats = await client.query(`
          SELECT 
            COUNT(*) as total_records,
            COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
            COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
            COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count
          FROM attendance 
          WHERE class_id = $1
        `, [classId]);

        // Get grade statistics
        const gradeStats = await client.query(`
          SELECT 
            COUNT(*) as total_grades,
            AVG(score) as average_score,
            MIN(score) as lowest_score,
            MAX(score) as highest_score
          FROM grades g 
          JOIN assessments a ON g.assessment_id = a.id 
          WHERE g.class_id = $1
        `, [classId]);

        // Get student count
        const studentCount = await client.query(`
          SELECT COUNT(DISTINCT student_id) as total_students 
          FROM class_students 
          WHERE class_id = $1
        `, [classId]);

        return {
          attendance: attendanceStats.rows[0],
          grades: gradeStats.rows[0],
          students: studentCount.rows[0]
        };
      } finally {
        client.release();
      }
    } catch (error) {
      throw new Error(`Failed to fetch analytics: ${error.message}`);
    }
  }
};

export default {
  userService,
  studentService,
  classService,
  attendanceService,
  assessmentService,
  gradeService,
  analyticsService
};
