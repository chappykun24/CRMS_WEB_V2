// Mock authentication service for local development
// This simulates API responses without needing a backend server

class MockAuthService {
  // Simulate user login
  async login(email, password) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock user validation
    const mockUsers = {
      'admin@university.edu': { role: 'admin', name: 'Admin User' },
      'dean@university.edu': { role: 'dean', name: 'Dean User' },
      'faculty@university.edu': { role: 'faculty', name: 'Faculty User' },
      'staff@university.edu': { role: 'staff', name: 'Staff User' },
      'programchair@university.edu': { role: 'programchair', name: 'Program Chair User' }
    };
    
    if (mockUsers[email] && password === 'password123') {
      return {
        success: true,
        user: {
          id: 1, // Use consistent ID for development
          email: email,
          role: mockUsers[email].role,
          name: mockUsers[email].name,
          profilePic: null // Initialize with no profile picture
        },
        message: 'Login successful'
      };
    } else {
      return {
        success: false,
        error: 'Invalid email or password'
      };
    }
  }
  
  // Simulate user creation
  async createUser(userData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      user: {
        id: 1, // Use consistent ID for development
        profilePic: null, // Initialize with no profile picture
        ...userData
      },
      message: 'User created successfully'
    };
  }
  
  // Simulate getting user by ID
  async getUserById(userId) {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      user: {
        id: userId,
        email: 'user@example.com',
        role: 'user',
        name: 'Example User',
        profilePic: null // Initialize with no profile picture
      }
    };
  }
  
  // Simulate profile update
  async updateProfile(userId, profileData) {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    return {
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: userId,
        ...profileData
      }
    };
  }
  
  // Simulate connection test
  async testConnection() {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      success: true,
      message: 'Mock API connection successful'
    };
  }
}

export default new MockAuthService();
