# 🚀 CRMS User Login System Setup Guide

## 📋 What We've Created

### 1. **Database Scripts**
- `crms_v2_db_clean.sql` - Clean database schema (no comments)
- `add-missing-indexes.sql` - Adds missing indexes
- `create-all-indexes.sql` - Creates all indexes
- `create-user-credentials.sql` - Creates user accounts

### 2. **Authentication Service**
- `src/services/authService.js` - Handles user login/logout
- `test-user-login.js` - Tests the login system

### 3. **User Credentials**
All users are pre-approved and ready to use:

| Role | Email | Password | Description |
|------|-------|----------|-------------|
| **Admin** | `admin@university.edu` | `admin123` | System Administrator |
| **Faculty** | `faculty@university.edu` | `faculty123` | Faculty Member |
| **Dean** | `dean@university.edu` | `dean123` | Dean of College |
| **Staff** | `staff@university.edu` | `staff123` | Staff Member |
| **Program Chair** | `chair@university.edu` | `chair123` | Program Chair |

## 🔧 Setup Steps

### Step 1: Run Database Scripts in Neon

1. **Open Neon SQL Editor**
2. **Run the database schema:**
   ```sql
   -- Copy and paste the contents of crms_v2_db_clean.sql
   ```

3. **Create user accounts:**
   ```sql
   -- Copy and paste the contents of create-user-credentials.sql
   ```

4. **Add missing indexes:**
   ```sql
   -- Copy and paste the contents of add-missing-indexes.sql
   ```

### Step 2: Test Database Connection

```bash
node test-database-structure.js
```

Expected result: **Indexes: 4/4** ✅

### Step 3: Test User Login

```bash
node test-user-login.js
```

Expected result: All 5 users should login successfully ✅

## 🎯 How to Use in Your Web App

### 1. **Import the Auth Service**
```javascript
import authService from './src/services/authService.js';
```

### 2. **User Login**
```javascript
const result = await authService.login(email, password);
if (result.success) {
  console.log('Welcome,', result.user.name);
  console.log('Role:', result.user.role);
} else {
  console.log('Login failed:', result.error);
}
```

### 3. **Get User Profile**
```javascript
const user = await authService.getUserById(userId);
```

### 4. **Update Profile**
```javascript
const result = await authService.updateProfile(userId, {
  profile_type: 'faculty',
  designation: 'Assistant Professor',
  specialization: 'Computer Science',
  office_assigned: 'Room 301',
  bio: 'Experienced faculty member...'
});
```

## 🔒 Security Features

- ✅ **Password Verification** - Checks stored credentials
- ✅ **User Approval** - Only approved users can login
- ✅ **Role-Based Access** - Different permissions per role
- ✅ **Profile Management** - Update user information
- ✅ **Conflict Prevention** - Uses `ON CONFLICT` for safety

## 🧪 Testing Your Setup

### Quick Test Commands:
```bash
# Test database structure
node test-database-structure.js

# Test user login
node test-user-login.js

# Test specific user
node -e "
import authService from './src/services/authService.js';
authService.login('admin@university.edu', 'admin123')
  .then(result => console.log(result))
  .catch(console.error);
"
```

## 🚨 Important Notes

1. **Demo Passwords**: These are demo credentials - change in production!
2. **Password Hashing**: Production should use proper bcrypt hashing
3. **Environment Variables**: Ensure your `.env.local` has correct Neon details
4. **Database Name**: Must be `neondb` (not `CRMS_WEB_v2`)

## 🎉 What You Can Do Now

- ✅ **Login Users** - All 5 roles can authenticate
- ✅ **Role-Based Access** - Different dashboards per role
- ✅ **Profile Management** - Update user information
- ✅ **Database Integration** - Full CRMS functionality
- ✅ **Scalable System** - Add more users easily

## 🆘 Troubleshooting

### Common Issues:
1. **"Database does not exist"** → Check `.env.local` database name
2. **"Connection failed"** → Verify Neon credentials
3. **"User not found"** → Run `create-user-credentials.sql` first
4. **"Indexes missing"** → Run `add-missing-indexes.sql`

### Need Help?
- Check database connection: `node test-database-structure.js`
- Verify users exist: Check Neon Tables view
- Test login: `node test-user-login.js`

---

**🎯 Next Steps**: Integrate this into your React components and create role-based dashboards!
