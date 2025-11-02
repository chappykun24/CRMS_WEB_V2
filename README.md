# 🎓 CRMS Web V2 - Class Record Management System

A modern, production-ready Class Record Management System built with React and Node.js, optimized for deployment on Render and Vercel.

## ✨ Features

- 🔐 **Secure Authentication**: JWT-based authentication with role-based access control
- 👥 **User Management**: Faculty, staff, and student management with approval workflows
- 📚 **Course Management**: Complete course and program management system
- 📊 **Grade Management**: Comprehensive grading and assessment system
- 📅 **Attendance Tracking**: Real-time attendance monitoring
- 📈 **Analytics & Reports**: Detailed analytics and report generation
- 🎨 **Modern UI**: Clean, responsive interface built with Tailwind CSS
- 🚀 **Production Ready**: Optimized for cloud deployment

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **Backend**: Node.js, Express, PostgreSQL
- **Database**: Neon PostgreSQL (managed)
- **Authentication**: JWT with bcrypt password hashing
- **Deployment**: Render (Backend), Vercel (Frontend)
- **File Upload**: Multer with base64 conversion

## 🏗️ Project Structure

```
CRMS_WEB_V2/
├── backend/                    # Backend API Server
│   ├── config/                 # Database configuration
│   ├── middleware/             # Authentication, error handling
│   ├── controllers/            # Business logic
│   ├── routes/                 # API routes
│   ├── server-render.js        # Optimized for Render
│   └── package.json            # Backend dependencies
├── frontend/                   # React Frontend
│   ├── src/                    # Source code
│   ├── dist/                   # Built files (ready for Vercel)
│   └── package.json            # Frontend dependencies
├── db/                         # Database schema
│   └── crms_v2_database.sql    # Consolidated schema
└── docs/                       # Documentation
    ├── RENDER_DEPLOYMENT_SUMMARY.md   # Quick overview
    ├── DEPLOYMENT_CHECKLIST.md        # Step-by-step guide
    └── RENDER_SETUP_GUIDE.md          # Detailed setup
```

## 🚀 Quick Start

### Install Dependencies
```bash
npm run install:all
```

### Development (Both Frontend & Backend)
```bash
npm run dev
```

### Development (Separate Terminals)
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend  
npm run dev:frontend
```

## 🛠️ Individual Commands

### Backend Only
```bash
cd backend
npm install
npm run dev
```

### Frontend Only
```bash
cd frontend
npm install
npm run dev
```

## 🌐 Deployment

**Ready for production deployment!** Follow the comprehensive deployment guide:

### 📖 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - Complete Deployment Guide

This guide covers:
- Backend deployment to Render with Neon database
- Frontend deployment to Vercel
- Environment variable configuration
- Database setup and migration
- Troubleshooting and health checks

### Quick Setup Scripts

```bash
# Windows
setup-project.bat
test-local.bat
deploy-vercel.bat

# Linux/Mac
chmod +x setup-project.sh test-local.sh deploy-vercel.sh
./setup-project.sh
./test-local.sh
./deploy-vercel.sh
```

### Deployment URLs (After Setup)
- **Backend API**: `https://crms-backend-api.onrender.com`
- **Cluster API**: `https://crms-cluster-api.onrender.com` (KMeans clustering)
- **Frontend App**: `https://your-app.vercel.app`
- **Database**: Neon PostgreSQL (managed)

## 📚 Documentation

- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Complete deployment guide with clustering
- **[Deployment Summary](./RENDER_DEPLOYMENT_SUMMARY.md)** - Quick deployment overview
- **[Deployment Checklist](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step deployment guide
- **[Setup Guide](./RENDER_SETUP_GUIDE.md)** - Detailed setup instructions
- **[Code Improvements](./CODE_STRUCTURE_IMPROVEMENTS.md)** - Code structure improvements
- **[Database Schema](./db/DATABASE_CONSOLIDATION_SUMMARY.md)** - Database changes summary

## 🔧 Environment Variables

### Backend (Render)
```bash
NODE_ENV=production
PORT=3001
NEON_HOST=your-neon-host
NEON_DATABASE=your-database
NEON_USER=your-username
NEON_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
FRONTEND_URL=https://your-frontend.vercel.app
CLUSTER_SERVICE_URL=https://crms-cluster-api.onrender.com
```

### Cluster API (Render)
```bash
PORT=10000
```

### Frontend (Vercel)
```bash
VITE_API_BASE_URL=https://your-backend.onrender.com/api
VITE_APP_NAME=CRMS
VITE_APP_VERSION=2.0.0
```

## 🚨 Important Notes

- **Security**: All passwords are hashed with bcrypt
- **CORS**: Configured for production deployment
- **Database**: Uses connection pooling for optimal performance
- **Monitoring**: Built-in health checks and error logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

## 🎉 Ready to Deploy!

Your CRMS application is fully prepared for production deployment. Start with the [Deployment Summary](./RENDER_DEPLOYMENT_SUMMARY.md) for a quick overview, then follow the [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) for step-by-step instructions.

**Happy Deploying! 🚀**