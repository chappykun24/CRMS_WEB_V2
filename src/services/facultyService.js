// Dynamic API base URL that works both locally and in production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? ''  // In production, use relative path (Vercel will route to API functions)
  : 'http://localhost:3001';  // In development, use local backend (no /api suffix)

// Faculty Registration API calls
export const facultyService = {
  // Register new faculty member
  async register(facultyData) {
    try {
      console.log('📝 [FRONTEND] Registering faculty member:', {
        firstName: facultyData.firstName,
        lastName: facultyData.lastName,
        email: facultyData.email,
        department: facultyData.department,
        schoolTerm: facultyData.schoolTerm,
        hasProfilePic: !!facultyData.profilePic
      });
      
      console.log('🔍 [FRONTEND] Sending request to:', `${API_BASE_URL}/api/auth/register`);
      console.log('🌍 [FRONTEND] Environment:', process.env.NODE_ENV);
      console.log('🔗 [FRONTEND] API Base URL:', API_BASE_URL);
      
      // Use FormData for file uploads
      const formData = new FormData();
      
      // Add all text fields
      Object.keys(facultyData).forEach(key => {
        if (key === 'profilePic' && facultyData[key] instanceof File) {
          // Add file with proper field name
          formData.append('profilePic', facultyData[key]);
        } else if (key !== 'profilePic') {
          // Add all other fields as text
          formData.append(key, facultyData[key]);
        }
      });
      
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        body: formData, // Don't set Content-Type header - let browser set it with boundary
      });
      
      console.log('📡 [FRONTEND] Response status:', response.status);
      console.log('📡 [FRONTEND] Response ok:', response.ok);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [FRONTEND] Response not ok. Status:', response.status);
        console.error('❌ [FRONTEND] Error response:', errorData);
        throw new Error(errorData.error || `Registration failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ [FRONTEND] Faculty registration successful:', data);
      return data;
    } catch (error) {
      console.error('❌ [FRONTEND] Error registering faculty:', error);
      console.error('🔍 [FRONTEND] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      throw error;
    }
  },

  // Get faculty approval status
  async getApprovalStatus(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/approval-status`);
      if (!response.ok) {
        throw new Error('Failed to get approval status');
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting approval status:', error);
      throw error;
    }
  },

  // Check if email is available
  async checkEmailAvailability(email) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/check-email?email=${encodeURIComponent(email)}`);
      if (!response.ok) {
        throw new Error('Failed to check email availability');
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking email availability:', error);
      throw error;
    }
  },

  // Helper function to validate image file
  validateImageFile(file) {
    if (!file) return { isValid: true, message: 'No file selected' };
    
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (file.size > maxSize) {
      return { isValid: false, message: 'File size must be less than 5MB' };
    }
    
    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, message: 'Only JPEG, PNG, GIF, and WebP images are allowed' };
    }
    
    return { isValid: true, message: 'File is valid' };
  }
};
