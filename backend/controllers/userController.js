import db from '../config/database.js';

// Get all users with pagination and filtering
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role_id, department_id, search, status } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    if (role_id) {
      paramCount++;
      whereClause += ` AND u.role_id = $${paramCount}`;
      queryParams.push(role_id);
    }

    if (department_id) {
      paramCount++;
      whereClause += ` AND u.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (u.first_name ILIKE $${paramCount} OR u.last_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    if (status) {
      paramCount++;
      // Handle both is_approved and is_active fields
      // If status is 'pending', check for FALSE or NULL in either field
      if (status === 'pending') {
        whereClause += ` AND (COALESCE(u.is_approved, u.is_active, FALSE) = FALSE OR COALESCE(u.is_approved, u.is_active) IS NULL)`;
      } else {
        whereClause += ` AND COALESCE(u.is_approved, u.is_active, FALSE) = $${paramCount}`;
        queryParams.push(status === 'active' || status === 'approved');
      }
    }
    
    // If role_id is provided and it's for faculty (role_id = 2), 
    // optionally filter for pending approval
    // Note: This can be controlled via a separate 'pending_only' parameter
    if (req.query.pending_only === 'true' && role_id) {
      paramCount++;
      whereClause += ` AND (COALESCE(u.is_approved, u.is_active, FALSE) = FALSE OR COALESCE(u.is_approved, u.is_active) IS NULL)`;
    }

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `, queryParams);

    const total = parseInt(countResult.rows[0].total);

    // Get users with pagination
    paramCount++;
    const limitParam = `$${paramCount}`;
    paramCount++;
    const offsetParam = `$${paramCount}`;
    queryParams.push(limit, offset);

    // Build SELECT query - handle both is_approved and is_active fields
    // Try is_approved first (from schema), fallback to is_active if needed
    const result = await db.query(`
      SELECT u.user_id, u.email, 
             COALESCE(u.first_name || ' ' || COALESCE(u.middle_name || '', '') || ' ' || u.last_name, u.name) as name,
             u.first_name, u.last_name, u.middle_name, 
             u.role_id, u.department_id, u.employee_id, u.phone, 
             COALESCE(u.is_approved, u.is_active, FALSE) as is_approved,
             COALESCE(u.is_active, u.is_approved, FALSE) as is_active,
             u.profile_pic, u.last_login, u.created_at, u.updated_at,
             r.name as role_name, d.name as department_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `, queryParams);

    res.json({
      success: true,
      data: {
        users: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT u.user_id, u.email, u.first_name, u.last_name, u.middle_name, 
             u.role_id, u.department_id, u.employee_id, u.phone, u.profile_photo, 
             u.is_active, u.last_login, u.created_at, u.updated_at,
             r.name as role_name, d.name as department_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.user_id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    res.json({
      success: true,
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const { email, password, first_name, last_name, middle_name, role_id, department_id, employee_id, phone } = req.body;

    // Check if user already exists
    const existingUser = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists',
        statusCode: 409
      });
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const result = await db.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, middle_name, role_id, department_id, employee_id, phone, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING user_id, email, first_name, last_name, middle_name, role_id, department_id, employee_id, phone, is_active, created_at
    `, [email, hashedPassword, first_name, last_name, middle_name, role_id, department_id, employee_id, phone, true]);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, middle_name, role_id, department_id, employee_id, phone, is_active } = req.body;

    const result = await db.query(`
      UPDATE users 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          middle_name = COALESCE($3, middle_name),
          role_id = COALESCE($4, role_id),
          department_id = COALESCE($5, department_id),
          employee_id = COALESCE($6, employee_id),
          phone = COALESCE($7, phone),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
      WHERE user_id = $9
      RETURNING user_id, email, first_name, last_name, middle_name, role_id, department_id, employee_id, phone, is_active, updated_at
    `, [first_name, last_name, middle_name, role_id, department_id, employee_id, phone, is_active, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: result.rows[0] }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        statusCode: 404
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Approve user
export const approveUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    // Update user status
    await db.query('UPDATE users SET is_active = true, updated_at = NOW() WHERE user_id = $1', [id]);

    // Update approval record
    await db.query(`
      UPDATE user_approvals 
      SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), remarks = $2
      WHERE user_id = $3
    `, [req.user.user_id, remarks, id]);

    res.json({
      success: true,
      message: 'User approved successfully'
    });
  } catch (error) {
    console.error('Approve user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Reject user
export const rejectUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    // Update approval record
    await db.query(`
      UPDATE user_approvals 
      SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), remarks = $2
      WHERE user_id = $3
    `, [req.user.user_id, remarks, id]);

    res.json({
      success: true,
      message: 'User rejected successfully'
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};

// Get pending approvals
export const getPendingApprovals = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT ua.approval_id, ua.user_id, ua.status, ua.requested_at, ua.remarks,
             u.email, u.first_name, u.last_name, u.role_id, u.department_id,
             r.name as role_name, d.name as department_name
      FROM user_approvals ua
      JOIN users u ON ua.user_id = u.user_id
      LEFT JOIN roles r ON u.role_id = r.role_id
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE ua.status = 'pending'
      ORDER BY ua.requested_at ASC
    `);

    res.json({
      success: true,
      data: { approvals: result.rows }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      statusCode: 500
    });
  }
};
