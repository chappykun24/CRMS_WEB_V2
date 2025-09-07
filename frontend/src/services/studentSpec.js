// Student registration specification and helpers (web version)

// Required fields for students-only registration (no users linkage)
export const requiredStudentFields = [
  'studentNumber',
  'firstName',
  'lastName',
  'email',
];

// Simple validators
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Allow digits and hyphen (e.g., 22-123456)
const srCodeRegex = /^[0-9-]+$/;

export function validateStudentRegistration(formData) {
  const errors = {};

  // Required checks
  requiredStudentFields.forEach((field) => {
    const value = (formData?.[field] ?? '').toString().trim();
    if (!value) {
      errors[field] = 'This field is required';
    }
  });

  // Field-specific checks
  if (formData?.email && !emailRegex.test(String(formData.email).trim())) {
    errors.email = 'Please enter a valid email address';
  }

  if (formData?.studentNumber && !srCodeRegex.test(String(formData.studentNumber).trim())) {
    errors.studentNumber = 'SR-Code can only contain numbers and hyphens';
  }

  if (formData?.firstName && String(formData.firstName).trim().length < 2) {
    errors.firstName = 'First name must be at least 2 characters';
  }

  if (formData?.lastName && String(formData.lastName).trim().length < 2) {
    errors.lastName = 'Last name must be at least 2 characters';
  }

  // Gender optional but if provided must be one of expected values
  if (formData?.gender) {
    const normalized = String(formData.gender).toLowerCase();
    const allowed = ['male', 'female', 'other'];
    if (!allowed.includes(normalized)) {
      errors.gender = 'Gender must be male, female, or other';
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

// Build API payload for POST /api/students/register (backend expects these keys)
export function buildStudentRegistrationPayload(formData) {
  return {
    studentNumber: String(formData.studentNumber || '').trim(),
    firstName: String(formData.firstName || '').trim(),
    lastName: String(formData.lastName || '').trim(),
    middleInitial: String(formData.middleInitial || '').trim(),
    suffix: String(formData.suffix || '').trim(),
    email: String(formData.email || '').trim(),
    gender: formData.gender ? String(formData.gender).toLowerCase() : '',
    birthDate: formData.birthDate || '',
    // Optional base64 or URL preview string from file input
    profilePic: formData.profilePic || null,
  };
}

// Build API payload for PUT /api/students/:id (same fields as registration, all optional)
export function buildStudentUpdatePayload(formData) {
  return {
    studentNumber: formData.studentNumber ?? undefined,
    firstName: formData.firstName ?? undefined,
    lastName: formData.lastName ?? undefined,
    middleInitial: formData.middleInitial ?? undefined,
    suffix: formData.suffix ?? undefined,
    email: formData.email ?? undefined,
    gender: formData.gender ? String(formData.gender).toLowerCase() : undefined,
    birthDate: formData.birthDate ?? undefined,
    profilePic: formData.profilePic ?? undefined,
  };
}


