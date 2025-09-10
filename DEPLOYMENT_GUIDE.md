# CRMS Deployment Guide

This guide will help you deploy the CRMS (Class Record Management System) application to production using Render for the backend and Vercel for the frontend.

## Prerequisites

1. **Neon Database Account**: Sign up at [neon.tech](https://neon.tech)
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
4. **Vercel CLI**: Install with `npm install -g vercel`

## Backend Deployment (Render)

### 1. Set up Neon Database

1. Create a new project in Neon
2. Note down the connection details:
   - Host
   - Database name
   - Username
   - Password
   - Port (usually 5432)

### 2. Deploy to Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Use the following settings:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Health Check Path**: `/api/health`

### 3. Environment Variables

Set the following environment variables in Render:

```
NODE_ENV=production
PORT=3001
NEON_HOST=your-neon-host
NEON_DATABASE=your-database-name
NEON_USER=your-username
NEON_PASSWORD=your-password
NEON_PORT=5432
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://your-frontend-domain.vercel.app
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### 4. Database Setup

Run the SQL script from `db/crms_v2_database.sql` in your Neon database to create the required tables.

## Frontend Deployment (Vercel)

### 1. Deploy to Vercel

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel --prod
   ```

### 2. Environment Variables

Set the following environment variables in Vercel:

```
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
VITE_APP_NAME=CRMS
VITE_APP_VERSION=2.0.0
```

## Development Setup

### 1. Install Dependencies

Run the setup script:
```bash
# Windows
setup-project.bat

# Linux/Mac
chmod +x setup-project.sh
./setup-project.sh
```

Or manually:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start Development

```bash
npm run dev
```

This will start both backend (port 3001) and frontend (port 3000).

## Project Structure

```
CRMS_WEB_V2/
├── backend/                 # Node.js/Express backend
│   ├── config/             # Database configuration
│   ├── controllers/        # Route controllers
│   ├── middleware/         # Custom middleware
│   ├── routes/            # API routes
│   └── server-new.js      # Main server file
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── services/      # API services
│   └── vercel.json        # Vercel configuration
├── db/                     # Database scripts
├── render.yaml            # Render deployment config
└── vercel.json            # Vercel deployment config
```

## Key Features Fixed

1. **Context Consolidation**: Merged AuthContext and UserContext to prevent conflicts
2. **Routing**: Fixed routing structure and protected routes
3. **API Configuration**: Updated for production deployment
4. **Database Configuration**: Supports both Neon and Render databases
5. **CORS Configuration**: Properly configured for production
6. **Build Optimization**: Optimized Vite build configuration

## Troubleshooting

### Backend Issues

1. **Database Connection**: Check environment variables in Render
2. **CORS Errors**: Verify FRONTEND_URL and CORS_ORIGIN settings
3. **Health Check**: Ensure `/api/health` endpoint is working

### Frontend Issues

1. **API Connection**: Check VITE_API_BASE_URL environment variable
2. **Build Errors**: Run `npm run build` locally to check for errors
3. **Routing**: Ensure all routes are properly configured

### Common Commands

```bash
# Check backend health
curl https://your-backend-url.onrender.com/api/health

# Build frontend locally
cd frontend && npm run build

# Deploy frontend
cd frontend && vercel --prod

# View logs in Render
# Check Render dashboard for application logs
```

## Support

If you encounter any issues:

1. Check the application logs in Render dashboard
2. Verify all environment variables are set correctly
3. Ensure the database is properly configured
4. Check the browser console for frontend errors

## Security Notes

1. Use strong JWT secrets
2. Keep database credentials secure
3. Regularly update dependencies
4. Monitor application logs for suspicious activity
