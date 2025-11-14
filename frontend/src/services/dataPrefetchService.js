/**
 * Data Prefetching Service
 * Prefetches data for sidebar pages in the background to improve navigation performance
 */

import { API_BASE_URL } from '../utils/api';

// In-memory cache for prefetched data
const prefetchCache = new Map();

// Cache expiration time (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

/**
 * Get cached data if it exists and is not expired
 */
const getCachedData = (key) => {
  const cached = prefetchCache.get(key);
  if (!cached) return null;
  
  const now = Date.now();
  if (now - cached.timestamp > CACHE_EXPIRY) {
    prefetchCache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * Set data in cache
 */
const setCachedData = (key, data) => {
  prefetchCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Prefetch analytics data
 */
const prefetchAnalytics = async (termId = null) => {
  try {
    const cacheKey = `analytics_${termId || 'all'}`;
    
    // Check if already cached
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Analytics data already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching analytics data...');
    const url = termId 
      ? `${API_BASE_URL}/assessments/dean-analytics/sample?term_id=${termId}`
      : `${API_BASE_URL}/assessments/dean-analytics/sample`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Analytics fetch failed: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Try to read as text to see what we got
      const text = await response.text();
      console.error('❌ [Prefetch] Analytics response is not JSON:', text.substring(0, 200));
      throw new Error('Analytics response is not JSON');
    }
    
    // Clone response before parsing to allow error handling
    const clonedResponse = response.clone();
    try {
      const data = await response.json();
      setCachedData(cacheKey, data);
      console.log('✅ [Prefetch] Analytics data cached');
      return data;
    } catch (jsonError) {
      console.error('❌ [Prefetch] Error parsing analytics JSON:', jsonError);
      // Try to read error text from cloned response
      try {
        const errorText = await clonedResponse.text();
        console.error('❌ [Prefetch] Analytics response text (first 500 chars):', errorText.substring(0, 500));
      } catch (e) {
        console.error('❌ [Prefetch] Could not read response as text:', e);
      }
      throw jsonError;
    }
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching analytics:', error);
    return null;
  }
};

/**
 * Prefetch classes data
 */
const prefetchClasses = async () => {
  try {
    const cacheKey = 'classes_assigned';
    
    // Check if already cached
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Classes data already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching classes data...');
    const response = await fetch(`${API_BASE_URL}/section-courses/assigned`);
    if (!response.ok) {
      throw new Error(`Classes fetch failed: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      // Try to read as text to see what we got
      const text = await response.text();
      console.error('❌ [Prefetch] Classes response is not JSON:', text.substring(0, 200));
      throw new Error('Classes response is not JSON');
    }
    
    // Clone response before parsing to allow error handling
    const clonedResponse = response.clone();
    try {
      const data = await response.json();
      setCachedData(cacheKey, data);
      console.log('✅ [Prefetch] Classes data cached');
      return data;
    } catch (jsonError) {
      console.error('❌ [Prefetch] Error parsing classes JSON:', jsonError);
      // Try to read error text from cloned response
      try {
        const errorText = await clonedResponse.text();
        console.error('❌ [Prefetch] Classes response text (first 500 chars):', errorText.substring(0, 500));
      } catch (e) {
        console.error('❌ [Prefetch] Could not read response as text:', e);
      }
      throw jsonError;
    }
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching classes:', error);
    return null;
  }
};

/**
 * Prefetch school terms
 */
const prefetchSchoolTerms = async () => {
  try {
    const cacheKey = 'school_terms';
    
    // Check if already cached
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] School terms already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching school terms...');
    const response = await fetch(`${API_BASE_URL}/school-terms`);
    if (!response.ok) {
      throw new Error(`School terms fetch failed: ${response.status}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('School terms response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] School terms cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching school terms:', error);
    return null;
  }
};

/**
 * Prefetch users data
 */
const prefetchUsers = async () => {
  try {
    const cacheKey = 'users_all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Users already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching users...');
    const response = await fetch(`${API_BASE_URL}/users`);
    if (!response.ok) throw new Error(`Users fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Users response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Users cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching users:', error);
    return null;
  }
};

/**
 * Prefetch roles data
 */
const prefetchRoles = async () => {
  try {
    const cacheKey = 'roles_all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Roles already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching roles...');
    const response = await fetch(`${API_BASE_URL}/roles`);
    if (!response.ok) throw new Error(`Roles fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Roles response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Roles cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching roles:', error);
    return null;
  }
};

/**
 * Prefetch departments data
 */
const prefetchDepartments = async () => {
  try {
    const cacheKey = 'departments_all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Departments already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching departments...');
    const response = await fetch(`${API_BASE_URL}/departments`);
    if (!response.ok) throw new Error(`Departments fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Departments response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Departments cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching departments:', error);
    return null;
  }
};

/**
 * Prefetch students data
 */
const prefetchStudents = async () => {
  try {
    const cacheKey = 'students_all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Students already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching students...');
    const response = await fetch(`${API_BASE_URL}/students`);
    if (!response.ok) throw new Error(`Students fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Students response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Students cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching students:', error);
    return null;
  }
};

/**
 * Prefetch programs data
 */
const prefetchPrograms = async () => {
  try {
    const cacheKey = 'programs_all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Programs already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching programs...');
    const response = await fetch(`${API_BASE_URL}/catalog/programs`);
    if (!response.ok) throw new Error(`Programs fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Programs response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Programs cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching programs:', error);
    return null;
  }
};

/**
 * Prefetch courses data
 */
const prefetchCourses = async () => {
  try {
    const cacheKey = 'courses_all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Courses already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching courses...');
    const response = await fetch(`${API_BASE_URL}/catalog/courses`);
    if (!response.ok) throw new Error(`Courses fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Courses response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Courses cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching courses:', error);
    return null;
  }
};

/**
 * Prefetch sections data
 */
const prefetchSections = async () => {
  try {
    const cacheKey = 'sections_all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Sections already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching sections...');
    const response = await fetch(`${API_BASE_URL}/section-courses/sections`);
    if (!response.ok) throw new Error(`Sections fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Sections response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Sections cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching sections:', error);
    return null;
  }
};

/**
 * Prefetch faculty data
 */
const prefetchFaculty = async () => {
  try {
    const cacheKey = 'faculty_all';
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Faculty already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching faculty...');
    const response = await fetch(`${API_BASE_URL}/section-courses/faculty`);
    if (!response.ok) throw new Error(`Faculty fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Faculty response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Faculty cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching faculty:', error);
    return null;
  }
};

/**
 * Prefetch faculty classes data
 */
const prefetchFacultyClasses = async (facultyId) => {
  if (!facultyId) return null;
  
  try {
    const cacheKey = `faculty_classes_${facultyId}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      console.log('📦 [Prefetch] Faculty classes already cached');
      return cached;
    }
    
    console.log('🔄 [Prefetch] Fetching faculty classes...');
    const response = await fetch(`${API_BASE_URL}/section-courses/faculty/${facultyId}`);
    if (!response.ok) throw new Error(`Faculty classes fetch failed: ${response.status}`);
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Faculty classes response is not JSON');
    }
    
    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log('✅ [Prefetch] Faculty classes cached');
    return data;
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching faculty classes:', error);
    return null;
  }
};

/**
 * Prefetch all data for dean dashboard pages
 */
export const prefetchDeanData = async () => {
  console.log('🚀 [Prefetch] Starting dean data prefetch...');
  
  try {
    // Fetch school terms first (needed for analytics)
    const terms = await prefetchSchoolTerms();
    
    // Get active term ID for analytics
    let activeTermId = null;
    if (Array.isArray(terms)) {
      const activeTerm = terms.find(t => t.is_active);
      if (activeTerm) {
        activeTermId = activeTerm.term_id;
      }
    }
    
    // Prefetch all data in parallel (non-blocking)
    Promise.all([
      prefetchAnalytics(activeTermId),
      prefetchClasses(),
    ]).then(() => {
      console.log('✅ [Prefetch] All dean data prefetched');
    }).catch(error => {
      console.error('❌ [Prefetch] Error in parallel prefetch:', error);
    });
    
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching dean data:', error);
  }
};

// Track prefetch state to prevent multiple simultaneous calls
let prefetchInProgress = false
let prefetchPromise = null

/**
 * Prefetch all data for admin dashboard pages
 * Uses debouncing to prevent multiple simultaneous calls
 */
export const prefetchAdminData = async () => {
  // If already in progress, return the existing promise
  if (prefetchInProgress && prefetchPromise) {
    return prefetchPromise
  }

  // If data is already cached, skip prefetch
  const hasCachedData = 
    getCachedData('users_all') &&
    getCachedData('roles_all') &&
    getCachedData('departments_all') &&
    getCachedData('school_terms')
  
  if (hasCachedData) {
    return Promise.resolve()
  }

  prefetchInProgress = true
  console.log('🚀 [Prefetch] Starting admin data prefetch...');
  
  prefetchPromise = (async () => {
    try {
      // Prefetch all data in parallel (non-blocking)
      await Promise.all([
        prefetchUsers(),
        prefetchRoles(),
        prefetchDepartments(),
        prefetchSchoolTerms(),
      ])
      console.log('✅ [Prefetch] All admin data prefetched');
    } catch (error) {
      console.error('❌ [Prefetch] Error in parallel prefetch:', error);
    } finally {
      prefetchInProgress = false
      prefetchPromise = null
    }
  })()

  return prefetchPromise
};

// Track prefetch state to prevent multiple simultaneous calls
let staffPrefetchInProgress = false
let staffPrefetchPromise = null

/**
 * Prefetch all data for staff dashboard pages
 * Optimized to only prefetch if data is not already cached
 */
export const prefetchStaffData = async () => {
  // If already in progress, return the existing promise
  if (staffPrefetchInProgress && staffPrefetchPromise) {
    return staffPrefetchPromise
  }

  // Check if critical data is already cached - skip if so
  const hasCachedData = 
    getCachedData('students_all') &&
    getCachedData('departments_all') &&
    getCachedData('school_terms')
  
  if (hasCachedData) {
    console.log('📦 [Prefetch] Staff data already cached, skipping prefetch')
    return Promise.resolve()
  }

  staffPrefetchInProgress = true
  console.log('🚀 [Prefetch] Starting staff data prefetch...');
  
  staffPrefetchPromise = (async () => {
    try {
      // Prefetch critical data first, then secondary data
      // Use Promise.allSettled to prevent one failure from blocking others
      await Promise.allSettled([
        prefetchStudents(),
        prefetchDepartments(),
        prefetchSchoolTerms(),
      ])
      
      // Prefetch secondary data after critical data is loaded
      Promise.allSettled([
        prefetchPrograms(),
        prefetchClasses(),
        prefetchCourses(),
        prefetchSections(),
        prefetchFaculty(),
      ]).then(() => {
        console.log('✅ [Prefetch] All staff data prefetched');
      }).catch(error => {
        console.error('❌ [Prefetch] Error in secondary prefetch:', error);
      });
      
    } catch (error) {
      console.error('❌ [Prefetch] Error prefetching staff data:', error);
    } finally {
      staffPrefetchInProgress = false
      staffPrefetchPromise = null
    }
  })()

  return staffPrefetchPromise
};

/**
 * Prefetch all data for faculty dashboard pages
 * 
 * @deprecated This function is deprecated. Data is now fetched per section on demand.
 * Faculty pages now only fetch the classes list initially, and fetch section-specific
 * data (students, assessments, grades) only when a class is selected.
 * 
 * This change improves performance by:
 * - Reducing initial page load time
 * - Reducing unnecessary API calls
 * - Only fetching data the user is actively viewing
 * - Better scalability with many classes
 * 
 * See FACULTY_DATA_FETCHING_STRUCTURE.json for the new data fetching pattern.
 */
export const prefetchFacultyData = async (facultyId) => {
  console.warn('⚠️ [Prefetch] prefetchFacultyData is deprecated. Data is now fetched per section.');
  // This function is kept for backward compatibility but does nothing
  // Data fetching is now handled per section in each faculty page component
  return;
};

/**
 * Prefetch all data for program chair dashboard pages
 */
export const prefetchProgramChairData = async () => {
  console.log('🚀 [Prefetch] Starting program chair data prefetch...');
  
  try {
    // Fetch school terms first (needed for analytics and courses)
    const terms = await prefetchSchoolTerms();
    
    // Get active term ID for analytics
    let activeTermId = null;
    if (Array.isArray(terms)) {
      const activeTerm = terms.find(t => t.is_active);
      if (activeTerm) {
        activeTermId = activeTerm.term_id;
      }
    }
    
    // Prefetch all data in parallel (non-blocking)
    Promise.all([
      prefetchAnalytics(activeTermId),
      prefetchClasses(),
      prefetchPrograms(),
      prefetchCourses(),
      prefetchDepartments(),
    ]).then(() => {
      console.log('✅ [Prefetch] All program chair data prefetched');
    }).catch(error => {
      console.error('❌ [Prefetch] Error in parallel prefetch:', error);
    });
    
  } catch (error) {
    console.error('❌ [Prefetch] Error prefetching program chair data:', error);
  }
};

/**
 * Get prefetched analytics data
 */
export const getPrefetchedAnalytics = (termId = null) => {
  const cacheKey = `analytics_${termId || 'all'}`;
  return getCachedData(cacheKey);
};

/**
 * Get prefetched classes data
 */
export const getPrefetchedClasses = () => {
  return getCachedData('classes_assigned');
};

/**
 * Get prefetched school terms
 */
export const getPrefetchedSchoolTerms = () => {
  return getCachedData('school_terms');
};

/**
 * Get prefetched users
 */
export const getPrefetchedUsers = () => {
  return getCachedData('users_all');
};

/**
 * Get prefetched roles
 */
export const getPrefetchedRoles = () => {
  return getCachedData('roles_all');
};

/**
 * Get prefetched departments
 */
export const getPrefetchedDepartments = () => {
  return getCachedData('departments_all');
};

/**
 * Get prefetched students
 */
export const getPrefetchedStudents = () => {
  return getCachedData('students_all');
};

/**
 * Get prefetched programs
 */
export const getPrefetchedPrograms = () => {
  return getCachedData('programs_all');
};

/**
 * Get prefetched courses
 */
export const getPrefetchedCourses = () => {
  return getCachedData('courses_all');
};

/**
 * Get prefetched sections
 */
export const getPrefetchedSections = () => {
  return getCachedData('sections_all');
};

/**
 * Get prefetched faculty
 */
export const getPrefetchedFaculty = () => {
  return getCachedData('faculty_all');
};

/**
 * Get prefetched faculty classes
 */
export const getPrefetchedFacultyClasses = (facultyId) => {
  if (!facultyId) return null;
  return getCachedData(`faculty_classes_${facultyId}`);
};

/**
 * Clear all prefetch cache
 */
export const clearPrefetchCache = () => {
  prefetchCache.clear();
  console.log('🗑️ [Prefetch] Cache cleared');
};

/**
 * Clear specific cache entry
 */
export const clearPrefetchCacheEntry = (key) => {
  prefetchCache.delete(key);
  console.log(`🗑️ [Prefetch] Cache entry cleared: ${key}`);
};

