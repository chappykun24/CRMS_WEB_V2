// Browser-compatible authentication service
// Note: This is a temporary solution. In production, you should have a separate backend API.

class AuthService {
  // Mock user data for demonstration
  mockUsers = [
    {
      user_id: 1,
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
      profile_type: 'Administrator',
      designation: 'System Administrator',
      is_approved: true
    },
    {
      user_id: 2,
      name: 'Faculty User',
      email: 'faculty@example.com',
      role: 'faculty',
      profile_type: 'Faculty',
      designation: 'Assistant Professor',
      is_approved: true
    }
  ];

  // User login (mock implementation)
  async login(email, password) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Find user in mock data
      const user = this.mockUsers.find(u => u.email === email);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if user is approved
      if (!user.is_approved) {
        throw new Error('Account not approved');
      }
      
      // Mock password validation (in real app, this would be done on backend)
      if (password === 'password123') {
        // Return user data (without password)
        const { password_hash, ...userData } = user;
        return {
          success: true,
          user: userData,
          message: 'Login successful'
        };
      } else {
        throw new Error('Invalid password');
      }
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Create new user (mock implementation)
  async createUser(userData) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { name, email, password, role } = userData;
      
      // Check if user already exists
      if (this.mockUsers.find(u => u.email === email)) {
        throw new Error('User already exists');
      }
      
      // Create new user
      const newUser = {
        user_id: this.mockUsers.length + 1,
        name,
        email,
        role,
        profile_type: role === 'faculty' ? 'Faculty' : 'Student',
        designation: role === 'faculty' ? 'Faculty Member' : 'Student',
        is_approved: false
      };
      
      this.mockUsers.push(newUser);
      
      return {
        success: true,
        user_id: newUser.user_id,
        message: 'User created successfully. Awaiting approval.'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get user by ID (mock implementation)
  async getUserById(userId) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const user = this.mockUsers.find(u => u.user_id === userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        success: true,
        user
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Update user profile (mock implementation)
  async updateProfile(userId, profileData) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const userIndex = this.mockUsers.findIndex(u => u.user_id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }
      
      // Update user profile
      this.mockUsers[userIndex] = {
        ...this.mockUsers[userIndex],
        ...profileData,
        updated_at: new Date().toISOString()
      };
      
      return {
        success: true,
        profile: this.mockUsers[userIndex],
        message: 'Profile updated successfully'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new AuthService();
