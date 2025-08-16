import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const cleanKey = key.replace(/\x00/g, '').trim();
        const cleanValue = valueParts.join('=').replace(/\x00/g, '').trim();
        if (cleanKey && cleanValue) {
          process.env[cleanKey] = cleanValue;
        }
      }
    }
  });
} catch (error) {
  console.log('Error reading .env.local:', error.message);
}

dotenv.config({ path: envPath });

// Create database pool
const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`;

const pool = new Pool({
  connectionString,
  ssl: true,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});
import bcrypt from 'bcrypt';

class AuthService {
  // User login
  async login(email, password) {
    try {
      // Get user from database
      const userQuery = `
        SELECT u.user_id, u.name, u.email, u.password_hash, u.is_approved, 
               r.name as role, up.profile_type, up.designation
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN user_profiles up ON u.user_id = up.user_id
        WHERE u.email = $1
      `;
      
      const userResult = await pool.query(userQuery, [email]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.rows[0];
      
      // Check if user is approved
      if (!user.is_approved) {
        throw new Error('Account not approved');
      }
      
      // Verify password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (isPasswordValid) {
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
  
  // Create new user (for registration)
  async createUser(userData) {
    try {
      const { name, email, password, role } = userData;
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Insert user
      const insertQuery = `
        INSERT INTO users (name, email, password_hash, role_id, is_approved)
        VALUES ($1, $2, $3, $4, false)
        RETURNING user_id
      `;
      
      const roleResult = await pool.query('SELECT role_id FROM roles WHERE name = $1', [role]);
      if (roleResult.rows.length === 0) {
        throw new Error('Invalid role');
      }
      
      const result = await pool.query(insertQuery, [
        name, email, passwordHash, roleResult.rows[0].role_id
      ]);
      
      return {
        success: true,
        user_id: result.rows[0].user_id,
        message: 'User created successfully. Awaiting approval.'
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get user by ID
  async getUserById(userId) {
    try {
      const query = `
        SELECT u.user_id, u.name, u.email, u.is_approved, 
               r.name as role, up.profile_type, up.designation
        FROM users u
        JOIN roles r ON u.role_id = r.role_id
        LEFT JOIN user_profiles up ON u.user_id = up.user_id
        WHERE u.user_id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      
      if (result.rows.length === 0) {
        throw new Error('User not found');
      }
      
      return {
        success: true,
        user: result.rows[0]
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Update user profile
  async updateProfile(userId, profileData) {
    try {
      const { profile_type, designation, specialization, office_assigned, bio } = profileData;
      
      const query = `
        UPDATE user_profiles 
        SET profile_type = $1, designation = $2, specialization = $3, 
            office_assigned = $4, bio = $5, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        profile_type, designation, specialization, office_assigned, bio, userId
      ]);
      
      if (result.rows.length === 0) {
        throw new Error('Profile not found');
      }
      
      return {
        success: true,
        profile: result.rows[0],
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
