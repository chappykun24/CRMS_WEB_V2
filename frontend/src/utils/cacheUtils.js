/**
 * Utility functions for efficient caching with sessionStorage
 * Handles quota limits by storing only minimal essential data
 */

/**
 * Minimize class data by removing large fields (base64 images)
 * Only keeps essential fields for display
 */
export const minimizeClassData = (classes) => {
  if (!Array.isArray(classes)) return classes;
  
  return classes.map(cls => ({
    section_course_id: cls.section_course_id,
    section_id: cls.section_id,
    section_code: cls.section_code,
    course_id: cls.course_id,
    course_code: cls.course_code,
    course_title: cls.course_title,
    instructor_id: cls.instructor_id,
    faculty_name: cls.faculty_name,
    // Exclude large fields: faculty_avatar, banner_image
    // Only keep banner_type and banner_color for styling
    term_id: cls.term_id,
    semester: cls.semester,
    school_year: cls.school_year,
    banner_type: cls.banner_type,
    banner_color: cls.banner_color,
    // Add flag to indicate images are not cached
    _has_banner_image: !!cls.banner_image,
    _has_faculty_avatar: !!cls.faculty_avatar
  }));
};

/**
 * Minimize student data by removing large fields (base64 images)
 */
export const minimizeStudentData = (students) => {
  if (!Array.isArray(students)) return students;
  
  return students.map(student => ({
    enrollment_id: student.enrollment_id,
    student_id: student.student_id,
    student_number: student.student_number,
    full_name: student.full_name,
    contact_email: student.contact_email,
    classId: student.classId,
    // Exclude student_photo (large base64)
    _has_photo: !!student.student_photo
  }));
};

/**
 * Minimize grades data by removing large fields (base64 images)
 * Only keeps essential grading data
 */
export const minimizeGradesData = (gradesMap) => {
  if (!gradesMap || typeof gradesMap !== 'object') return gradesMap;
  
  const minimized = {};
  Object.entries(gradesMap).forEach(([enrollmentId, gradeData]) => {
    minimized[enrollmentId] = {
      enrollment_id: gradeData.enrollment_id,
      student_name: gradeData.student_name,
      student_number: gradeData.student_number,
      raw_score: gradeData.raw_score,
      late_penalty: gradeData.late_penalty,
      feedback: gradeData.feedback,
      submission_status: gradeData.submission_status,
      due_date: gradeData.due_date,
      // Exclude student_photo (large base64)
      _has_photo: !!gradeData.student_photo
    };
  });
  return minimized;
};

/**
 * Safe sessionStorage setItem with error handling and size checking
 */
export const safeSetItem = (key, value, minimizeFn = null) => {
  try {
    // Minimize data if function provided
    const dataToStore = minimizeFn ? minimizeFn(value) : value;
    const jsonString = JSON.stringify(dataToStore);
    
    // Check size (sessionStorage limit is typically 5-10MB)
    const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);
    if (sizeInMB > 4) { // Leave 1MB buffer
      console.warn(`⚠️ [CACHE] Data too large (${sizeInMB.toFixed(2)}MB) for ${key}, skipping cache`);
      return false;
    }
    
    sessionStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.warn(`⚠️ [CACHE] Quota exceeded for ${key}, clearing old cache`);
      // Try to clear old cache entries
      try {
        clearOldCacheEntries();
        // Retry once after clearing
        const dataToStore = minimizeFn ? minimizeFn(value) : value;
        sessionStorage.setItem(key, JSON.stringify(dataToStore));
        return true;
      } catch (retryError) {
        console.error(`❌ [CACHE] Failed to cache ${key} after clearing:`, retryError);
        return false;
      }
    } else {
      console.error(`❌ [CACHE] Error caching ${key}:`, error);
      return false;
    }
  }
};

/**
 * Safe sessionStorage getItem
 */
export const safeGetItem = (key) => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`❌ [CACHE] Error reading cache ${key}:`, error);
    // Clear invalid cache
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      // Ignore
    }
    return null;
  }
};

/**
 * Clear old cache entries to free up space
 * Uses a priority system: keeps class lists, clears section-specific data first
 */
const clearOldCacheEntries = () => {
  try {
    // Get all sessionStorage keys
    const allKeys = Object.keys(sessionStorage);
    
    // Priority: class lists are most important, section data can be cleared
    const classListKeys = allKeys.filter(key => key.startsWith('classes_'));
    const sectionDataKeys = allKeys.filter(key => 
      key.startsWith('students_') || 
      key.startsWith('assessments_') || 
      key.startsWith('grades_') ||
      key.startsWith('assessment_grades_')
    );
    
    // Clear section-specific data first (these are larger and less critical)
    let cleared = 0;
    sectionDataKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
        cleared++;
      } catch (e) {
        // Ignore errors
      }
    });
    
    // If still need space and have multiple class lists, keep only the first one
    if (cleared === 0 && classListKeys.length > 1) {
      // Keep the first class list, clear others
      classListKeys.slice(1).forEach(key => {
        try {
          sessionStorage.removeItem(key);
          cleared++;
        } catch (e) {
          // Ignore errors
        }
      });
    }
    
    if (cleared > 0) {
      console.log(`🧹 [CACHE] Cleared ${cleared} cache entries to free up space`);
    }
  } catch (error) {
    console.error('❌ [CACHE] Error clearing old cache:', error);
  }
};

/**
 * Get cache size in MB
 */
export const getCacheSize = () => {
  try {
    let total = 0;
    for (let key in sessionStorage) {
      if (sessionStorage.hasOwnProperty(key)) {
        total += sessionStorage[key].length + key.length;
      }
    }
    return (total / (1024 * 1024)).toFixed(2);
  } catch (error) {
    return '0';
  }
};

