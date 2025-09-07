# 🚀 CRMS Deployment Checklist

## ✅ **Pre-Deployment Checklist**

### **1. Code Structure ✅**
- [x] Backend separated into `backend/` folder
- [x] Frontend separated into `frontend/` folder
- [x] Modular backend structure (config, middleware, controllers, routes)
- [x] Environment templates created
- [x] Database schema consolidated

### **2. Backend Preparation ✅**
- [x] `backend/server-render.js` optimized for Render
- [x] `backend/package.json` configured for production
- [x] Health check endpoint at `/api/health`
- [x] CORS configured for production
- [x] Error handling middleware

### **3. Frontend Preparation ✅**
- [x] `frontend/src/services/apiService.js` updated
- [x] Environment variables configured
- [x] Build process tested
- [x] API endpoints updated

## 🗄️ **Database Setup (Neon PostgreSQL)**

### **Step 1: Create Neon Account**
1. Go to [neon.tech](https://neon.tech)
2. Sign up with GitHub
3. Create new project: `crms-database`
4. Choose region: `US East (N. Virginia)` or closest to your users

### **Step 2: Get Database Credentials**
```bash
# Copy these from Neon dashboard:
NEON_HOST=ep-xxx-xxx.us-east-1.aws.neon.tech
NEON_DATABASE=neondb
NEON_USER=neondb_owner
NEON_PASSWORD=[your-password]
NEON_PORT=5432
```

### **Step 3: Deploy Database Schema**
1. In Neon dashboard → SQL Editor
2. Copy contents of `db/crms_v2_database.sql`
3. Paste and execute
4. Verify tables created successfully

## 🚀 **Backend Deployment (Render)**

### **Step 1: Create Render Account**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Connect your repository

### **Step 2: Deploy Backend Service**
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repository: `CRMS_WEB_V2`
3. Configure service:
   ```
   Name: crms-backend-api
   Environment: Node
   Region: Oregon (US West)
   Branch: master
   Root Directory: backend
   Build Command: npm install
   Start Command: npm start
   ```

### **Step 3: Set Environment Variables**
In Render dashboard → Environment:
```bash
NODE_ENV=production
PORT=3001
NEON_HOST=ep-xxx-xxx.us-east-1.aws.neon.tech
NEON_DATABASE=neondb
NEON_USER=neondb_owner
NEON_PASSWORD=your-neon-password
NEON_PORT=5432
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://your-frontend-domain.vercel.app
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### **Step 4: Deploy**
1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes)
3. Note your backend URL: `https://crms-backend-api.onrender.com`

## 🌐 **Frontend Deployment (Vercel)**

### **Step 1: Deploy to Vercel**
1. Go to [vercel.com](https://vercel.com)
2. Import GitHub repository: `CRMS_WEB_V2`
3. Configure:
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```

### **Step 2: Set Environment Variables**
In Vercel dashboard → Environment Variables:
```bash
VITE_API_BASE_URL=https://crms-backend-api.onrender.com/api
VITE_APP_NAME=CRMS
VITE_APP_VERSION=2.0.0
```

### **Step 3: Deploy**
1. Click **"Deploy"**
2. Wait for deployment (2-5 minutes)
3. Note your frontend URL: `https://crms-web-v2.vercel.app`

## 🔗 **Update Configuration**

### **Step 1: Update Backend CORS**
1. In Render dashboard → Environment
2. Update `FRONTEND_URL` and `CORS_ORIGIN` with your actual Vercel URL

### **Step 2: Update Frontend API URL**
1. In Vercel dashboard → Environment Variables
2. Update `VITE_API_BASE_URL` with your actual Render URL

## 🧪 **Testing Deployment**

### **Backend Health Check**
```bash
curl https://crms-backend-api.onrender.com/api/health
```
Expected response:
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "database": {
    "service": "database",
    "status": "healthy"
  }
}
```

### **Frontend Test**
1. Visit your Vercel URL
2. Try logging in
3. Verify API calls work
4. Check browser console for errors

## 📊 **Post-Deployment Setup**

### **1. Monitoring**
- [ ] Set up Render monitoring
- [ ] Set up Vercel analytics
- [ ] Monitor Neon database performance

### **2. Security**
- [ ] Verify HTTPS is working
- [ ] Check CORS configuration
- [ ] Validate JWT tokens

### **3. Performance**
- [ ] Test API response times
- [ ] Check database query performance
- [ ] Monitor memory usage

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **Database Connection Failed**
- Check Neon credentials
- Verify database is running
- Test connection in Neon SQL editor

#### **CORS Errors**
- Update CORS_ORIGIN in Render
- Check frontend URL in environment variables
- Verify API base URL in frontend

#### **Build Failures**
- Check package.json dependencies
- Verify build commands
- Check for missing environment variables

#### **404 Errors**
- Check route configurations
- Verify API endpoints
- Check health check path

## 📝 **Environment Variables Reference**

### **Backend (Render)**
```bash
NODE_ENV=production
PORT=3001
NEON_HOST=ep-xxx-xxx.us-east-1.aws.neon.tech
NEON_DATABASE=neondb
NEON_USER=neondb_owner
NEON_PASSWORD=your-password
NEON_PORT=5432
JWT_SECRET=your-jwt-secret
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGIN=https://your-frontend.vercel.app
```

### **Frontend (Vercel)**
```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api
VITE_APP_NAME=CRMS
VITE_APP_VERSION=2.0.0
```

## 🎯 **Final Checklist**

- [ ] Neon database created and schema deployed
- [ ] Render backend deployed and healthy
- [ ] Vercel frontend deployed and accessible
- [ ] Environment variables configured
- [ ] CORS settings updated
- [ ] API endpoints tested
- [ ] Frontend-backend communication verified
- [ ] HTTPS working on both services
- [ ] Monitoring set up
- [ ] Documentation updated

## 🎉 **Success!**

Your CRMS application is now live:
- **Backend**: `https://crms-backend-api.onrender.com`
- **Frontend**: `https://crms-web-v2.vercel.app`
- **Database**: Neon PostgreSQL (managed)

Remember to:
- Monitor your applications regularly
- Keep environment variables secure
- Update dependencies regularly
- Backup your database regularly
