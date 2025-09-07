# Render Deployment Setup Guide

## 🚀 **Complete Render Setup for CRMS Backend**

This guide will walk you through setting up your Render account and deploying your CRMS backend.

## 📋 **Prerequisites**

- ✅ Clean codebase (completed)
- ✅ Modular backend structure (completed)
- ✅ Database schema ready (completed)
- ✅ Environment variables configured

## 🔧 **Step 1: Create Render Account**

### **1.1 Sign Up for Render**
1. Go to [render.com](https://render.com)
2. Click **"Get Started for Free"**
3. Choose **"Sign up with GitHub"** (recommended)
4. Authorize Render to access your GitHub repositories

### **1.2 Verify Your Account**
1. Check your email for verification
2. Complete your profile setup
3. Add a payment method (required for free tier)

## 🗄️ **Step 2: Set Up Database (Neon PostgreSQL)**

### **2.1 Create Neon Account**
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create a new project named `crms-database`
4. Choose a region close to your users

### **2.2 Get Database Credentials**
1. In your Neon dashboard, go to **"Connection Details"**
2. Copy the following information:
   - **Host**: `ep-xxx-xxx.us-east-1.aws.neon.tech`
   - **Database**: `neondb`
   - **Username**: `neondb_owner`
   - **Password**: `[your-password]`
   - **Port**: `5432`

### **2.3 Run Database Schema**
1. In Neon dashboard, go to **"SQL Editor"**
2. Copy the contents of `db/crms_v2_database.sql`
3. Paste and run the SQL script
4. Verify tables are created successfully

## 🚀 **Step 3: Deploy Backend to Render**

### **3.1 Connect GitHub Repository**
1. In Render dashboard, click **"New +"**
2. Select **"Web Service"**
3. Connect your GitHub account
4. Select your `CRMS_WEB_V2` repository
5. Choose the **"backend"** folder as the root directory

### **3.2 Configure Web Service**
```
Name: crms-backend-api
Environment: Node
Region: Oregon (US West)
Branch: master
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### **3.3 Set Environment Variables**
In Render dashboard, go to **"Environment"** and add:

```bash
# Database Configuration
NEON_HOST=ep-xxx-xxx.us-east-1.aws.neon.tech
NEON_DATABASE=neondb
NEON_USER=neondb_owner
NEON_PASSWORD=your-neon-password
NEON_PORT=5432

# Application Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend-domain.vercel.app

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### **3.4 Deploy Settings**
- **Auto-Deploy**: Yes (from master branch)
- **Health Check Path**: `/api/health`
- **Instance Type**: Free tier (Starter)

## 🌐 **Step 4: Deploy Frontend to Vercel**

### **4.1 Connect to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your `CRMS_WEB_V2` repository
4. Set **Root Directory** to `frontend`

### **4.2 Configure Frontend**
```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

### **4.3 Set Frontend Environment Variables**
In Vercel dashboard, go to **"Environment Variables"**:

```bash
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
VITE_APP_NAME=CRMS
VITE_APP_VERSION=2.0.0
```

## 🔗 **Step 5: Update API Configuration**

### **5.1 Update Frontend API URL**
1. In your local project, edit `frontend/src/services/apiService.js`
2. Update the `API_BASE_URL` to your Render backend URL:

```javascript
const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001/api'
  : 'https://your-backend-url.onrender.com/api';
```

### **5.2 Update CORS Configuration**
1. In Render dashboard, update environment variables
2. Add your Vercel frontend URL to CORS origins

## 🧪 **Step 6: Test Your Deployment**

### **6.1 Test Backend API**
1. Visit your Render backend URL: `https://your-backend-url.onrender.com/api/health`
2. Should return:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": {
    "service": "database",
    "status": "healthy"
  }
}
```

### **6.2 Test Frontend**
1. Visit your Vercel frontend URL
2. Try logging in with test credentials
3. Verify API calls are working

## 🔧 **Step 7: Production Optimizations**

### **7.1 Database Optimizations**
1. Enable connection pooling in Neon
2. Set up database monitoring
3. Configure automatic backups

### **7.2 Render Optimizations**
1. Enable auto-scaling (if needed)
2. Set up monitoring and alerts
3. Configure custom domain (optional)

### **7.3 Vercel Optimizations**
1. Enable edge functions (if needed)
2. Set up analytics
3. Configure custom domain (optional)

## 📊 **Step 8: Monitoring and Maintenance**

### **8.1 Set Up Monitoring**
1. **Render**: Built-in metrics and logs
2. **Vercel**: Analytics and performance monitoring
3. **Neon**: Database performance monitoring

### **8.2 Regular Maintenance**
1. Monitor error logs
2. Check database performance
3. Update dependencies regularly
4. Backup database regularly

## 🚨 **Troubleshooting Common Issues**

### **Issue 1: Database Connection Failed**
```bash
# Check environment variables
# Verify Neon credentials
# Test connection in Neon SQL editor
```

### **Issue 2: CORS Errors**
```bash
# Update CORS_ORIGIN in Render
# Check frontend URL in environment variables
# Verify API base URL in frontend
```

### **Issue 3: Build Failures**
```bash
# Check package.json dependencies
# Verify build commands
# Check for missing environment variables
```

### **Issue 4: 404 Errors**
```bash
# Check route configurations
# Verify API endpoints
# Check health check path
```

## 📝 **Environment Variables Reference**

### **Backend (Render)**
```bash
# Database
NEON_HOST=your-neon-host
NEON_DATABASE=your-database-name
NEON_USER=your-username
NEON_PASSWORD=your-password
NEON_PORT=5432

# Application
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://your-frontend.vercel.app

# Security
JWT_SECRET=your-jwt-secret-key
```

### **Frontend (Vercel)**
```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api
VITE_APP_NAME=CRMS
VITE_APP_VERSION=2.0.0
```

## 🎯 **Deployment Checklist**

- [ ] Render account created
- [ ] Neon database set up
- [ ] Database schema deployed
- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] API endpoints tested
- [ ] Frontend-backend communication verified
- [ ] Monitoring set up

## 🚀 **Next Steps After Deployment**

1. **Test all functionality** - Login, user management, etc.
2. **Set up monitoring** - Error tracking and performance
3. **Configure backups** - Database and file backups
4. **Set up CI/CD** - Automated deployments
5. **Add custom domains** - Professional URLs
6. **Implement SSL** - HTTPS everywhere
7. **Set up staging** - Test environment

## 📞 **Support Resources**

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Neon Documentation**: [neon.tech/docs](https://neon.tech/docs)
- **PostgreSQL Documentation**: [postgresql.org/docs](https://postgresql.org/docs)

---

## 🎉 **Congratulations!**

Your CRMS application is now deployed and ready for production use! 

**Backend URL**: `https://your-backend-url.onrender.com`
**Frontend URL**: `https://your-frontend-url.vercel.app`
**Database**: Neon PostgreSQL (managed)

Remember to keep your environment variables secure and monitor your application regularly!
