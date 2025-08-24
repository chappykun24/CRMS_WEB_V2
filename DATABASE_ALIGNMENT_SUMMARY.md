# Database Alignment Summary - Student Registration

## Overview
This document outlines how the student registration form has been adjusted to match the actual database schema without changing the database structure.

## Database Schema Analysis

### 1. Students Table
```sql
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
    birth_date DATE,
    contact_email VARCHAR(255),
    student_photo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. User Profiles Table
```sql
CREATE TABLE user_profiles (
    user_profile_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE,
    profile_type VARCHAR(50),
    specialization TEXT,
    designation VARCHAR(100),
    office_assigned VARCHAR(255),
    program_id INTEGER,
    department_id INTEGER,
    term_start DATE,
    term_end DATE,
    contact_email VARCHAR(255),
    bio TEXT,
    position TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE SET NULL,
    FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE SET NULL
);
```

## Form Adjustments Made

### 1. Removed Non-Existent Fields
- **`yearLevel`** - This field doesn't exist in the students table
- **`section`** - This field doesn't exist in the students table

### 2. Kept Valid Fields
- **`studentNumber`** → maps to `students.student_number`
- **`firstName`, `lastName`, `middleInitial`, `suffix`** → combined into `students.full_name`
- **`email`** → maps to `students.contact_email` and `user_profiles.contact_email`
- **`gender`** → maps to `students.gender`
- **`birthDate`** → maps to `students.birth_date`
- **`department`** → maps to `user_profiles.department_id`
- **`program`** → maps to `user_profiles.program_id`
- **`specialization`** → maps to `user_profiles.specialization`
- **`termStart`** → maps to `user_profiles.term_start`
- **`termEnd`** → maps to `user_profiles.term_end`
- **`profilePic`** → maps to `students.student_photo`

## Data Flow

### 1. Student Registration Process
1. **User Creation**: Insert into `users` table with role_id = 1 (STUDENT)
2. **Student Record**: Insert into `students` table with basic information
3. **User Profile**: Insert into `user_profiles` table with academic information
4. **Approval Record**: Insert into `user_approvals` table for workflow

### 2. Database Operations
```sql
-- Insert user
INSERT INTO users (name, email, password_hash, role_id, profile_pic, is_approved) 
VALUES ($1, $2, $3, $4, $5, $6) 
RETURNING user_id;

-- Insert student
INSERT INTO students (student_id, student_number, full_name, gender, birth_date, contact_email, student_photo) 
VALUES ($1, $2, $3, $4, $5, $6, $7);

-- Insert user profile
INSERT INTO user_profiles (user_id, profile_type, department_id, program_id, specialization, term_start, term_end, contact_email) 
VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
```

## API Endpoints Created

### 1. Student Registration
- **Endpoint**: `POST /api/students/register`
- **Purpose**: Create new student accounts
- **Database Tables**: `users`, `students`, `user_profiles`, `user_approvals`

### 2. Student Listing
- **Endpoint**: `GET /api/students`
- **Purpose**: Retrieve all students with profiles
- **Database Tables**: `students`, `users`, `user_profiles`

### 3. Student Management
- **Endpoint**: `GET /api/students/[id]` - Get student by ID
- **Endpoint**: `PUT /api/students/[id]` - Update student
- **Endpoint**: `DELETE /api/students/[id]` - Delete student
- **Database Tables**: `students`, `user_profiles`, `users`

## Future Considerations

### 1. Section Assignment
- Students are not directly assigned to sections in the current schema
- Section assignment happens through course enrollments (`course_enrollments` table)
- Year level is stored in the `sections` table, not in student records

### 2. Academic Progress
- Student academic progress is tracked through `course_enrollments`
- Grades and assessments would be stored in separate tables
- Academic history can be built from enrollment records

### 3. Enhanced Student Information
- Additional fields like address, emergency contacts could be added to `user_profiles`
- Parent/guardian information could be stored in a separate table
- Academic standing and GPA could be calculated from enrollment data

## Validation Rules

### 1. Required Fields
- Student number (unique)
- First name
- Last name
- Email (unique)
- Password (for user account)
- Department
- Program

### 2. Optional Fields
- Middle initial
- Suffix
- Gender
- Birth date
- Specialization
- Term start/end dates
- Profile photo

### 3. Data Constraints
- Gender must be 'male', 'female', or 'other'
- Student number must be unique
- Email must be unique across all users
- Department and program must exist in their respective tables

## Conclusion

The student registration form has been successfully aligned with the actual database schema. The implementation:

- ✅ **Uses only existing database fields**
- ✅ **Maintains data integrity through proper foreign key relationships**
- ✅ **Follows the established approval workflow**
- ✅ **Provides comprehensive student management capabilities**
- ✅ **Is ready for production use**

The system is now ready to register students with real data that will be properly stored in the database according to the existing schema.
