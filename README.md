# 🎓 CRMS Web V2 - Class Record Management System

A modern, production-ready Class Record Management System built with React and Node.js, designed for educational institutions to manage courses, students, grades, and academic records efficiently.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Development](#-development)
- [Deployment](#-deployment)
- [Security](#-security)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

- 🔐 **Secure Authentication** - JWT-based authentication with role-based access control (RBAC)
- 👥 **User Management** - Comprehensive user management with approval workflows
- 📚 **Course Management** - Complete course and program management system
- 📊 **Grade Management** - Comprehensive grading and assessment system
- 📅 **Attendance Tracking** - Real-time attendance monitoring and reporting
- 📈 **Analytics & Reports** - Detailed analytics with student clustering and performance insights
- 🎨 **Modern UI** - Clean, responsive interface built with Tailwind CSS
- 🚀 **Production Ready** - Optimized for cloud deployment with caching and performance monitoring

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Database (Neon managed)
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing

### Additional Services
- **Python Flask API** - KMeans clustering service for student analytics
- **Render** - Backend hosting platform
- **Vercel** - Frontend hosting platform

---

## 🏗️ Project Structure

```
CRMS_WEB_V2/
├── backend/                    # Backend API Server
│   ├── config/                 # Configuration files
│   │   └── database.js        # Database connection setup
│   ├── controllers/           # Request handlers
│   ├── middleware/            # Authentication, validation, error handling
│   ├── routes/                # API route definitions
│   ├── services/              # Business logic services
│   ├── server.js              # Main server entry point
│   └── package.json           # Backend dependencies
│
├── frontend/                   # React Frontend Application
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API service layer
│   │   ├── contexts/          # React context providers
│   │   ├── utils/              # Utility functions
│   │   └── main.jsx           # Application entry point
│   ├── index.html             # HTML template
│   ├── vite.config.js         # Vite configuration
│   ├── tailwind.config.js     # Tailwind CSS configuration
│   └── package.json            # Frontend dependencies
│
├── python-cluster-api/         # Python Clustering Service
│   ├── app.py                 # Flask API application
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Docker configuration
│   └── Procfile               # Process configuration
│
├── db/                         # Database Schema
│   └── crms_v2_complete_schema.sql  # Complete database schema
│
├── archive/                    # Archived files (not deployed)
│   ├── scripts/               # Utility scripts
│   ├── documentation/         # Historical documentation
│   └── migrations/           # Old migration files
│
├── .gitignore                  # Git ignore rules
├── package.json                # Root workspace configuration
└── README.md                   # This file
```

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** (v9 or higher) or **yarn**
- **Python** (v3.9 or higher) - For clustering API
- **PostgreSQL** (v14 or higher) - Or access to Neon PostgreSQL
- **Git** - Version control

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd CRMS_WEB_V2
```

### 2. Install Dependencies

Install all dependencies (root, backend, and frontend):

```bash
npm run install:all
```

Or install individually:

```bash
# Root dependencies
npm install

# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Python Clustering API Setup

```bash
cd python-cluster-api
pip install -r requirements.txt
```

---

## ⚙️ Configuration

### Environment Variables

**⚠️ Security Note:** Never commit environment variables or `.env` files to version control. Always use secure environment variable management in your deployment platform.

#### Backend Environment Variables

Create a `.env` file in the `backend/` directory or set these in your deployment platform:

```bash
# Application
NODE_ENV=production
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend.vercel.app

# JWT Secret (use a strong, random string)
JWT_SECRET=your-secure-jwt-secret-key-here

# Database Configuration
# Use environment variables provided by your database provider
# Never hardcode credentials in source code

# Clustering Service
CLUSTER_SERVICE_URL=https://your-cluster-api.onrender.com
CLUSTER_API_TIMEOUT_MS=30000
```

#### Frontend Environment Variables

Set these in Vercel dashboard or create a `.env` file in the `frontend/` directory:

```bash
# API Configuration
VITE_API_BASE_URL=https://your-backend.onrender.com/api

# Application Info
VITE_APP_NAME=CRMS
VITE_APP_VERSION=2.0.0
```

#### Python Clustering API Environment Variables

Set in Render dashboard:

```bash
PORT=10000
```

### Database Setup

1. **Create a PostgreSQL Database**
   - Use Neon PostgreSQL (recommended) or any PostgreSQL provider
   - Note your connection credentials securely

2. **Run Database Schema**
   ```bash
   # Connect to your database and run:
   psql -h <host> -U <user> -d <database> -f db/crms_v2_complete_schema.sql
   ```

3. **Configure Database Connection**
   - Set database environment variables in your backend deployment platform
   - Never expose database credentials in code or documentation

---

## 💻 Development

### Start Development Servers

#### Option 1: Run Both Services Together

```bash
npm run dev
```

This starts both backend and frontend concurrently.

#### Option 2: Run Services Separately

**Terminal 1 - Backend:**
```bash
npm run dev:backend
# or
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
# or
cd frontend
npm run dev
```

### Development URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Python Cluster API**: http://localhost:10000 (if running locally)

### Available Scripts

#### Root Level
```bash
npm run dev              # Start both frontend and backend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only
npm run install:all     # Install all dependencies
npm run build:frontend   # Build frontend for production
```

#### Backend
```bash
npm run dev              # Start development server
npm start                # Start production server
```

#### Frontend
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint errors
```

---

## 🌐 Deployment

### Backend Deployment (Render)

1. **Connect Repository** to Render
2. **Create Web Service** with the following settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

3. **Set Environment Variables** in Render dashboard (see Configuration section)

### Frontend Deployment (Vercel)

1. **Connect Repository** to Vercel
2. **Configure Project**:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Set Environment Variables** in Vercel dashboard

### Python Clustering API Deployment (Render)

1. **Create Web Service** with:
   - **Root Directory**: `python-cluster-api`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT`
   - **Environment Variable**: `PORT=10000`

2. **Update Backend** with the cluster API URL:
   ```bash
   CLUSTER_SERVICE_URL=https://your-cluster-api.onrender.com
   ```

### Deployment Checklist

- [ ] Database created and schema applied
- [ ] Environment variables configured
- [ ] Backend deployed and health check passing
- [ ] Frontend deployed and accessible
- [ ] Clustering API deployed (if using analytics)
- [ ] CORS configured correctly
- [ ] SSL certificates active
- [ ] Error monitoring configured

---

## 🔒 Security

### Security Best Practices

1. **Environment Variables**
   - ✅ Never commit `.env` files
   - ✅ Use strong, unique secrets for JWT
   - ✅ Rotate credentials regularly
   - ✅ Use different credentials for development and production

2. **Authentication**
   - ✅ Passwords are hashed using bcrypt
   - ✅ JWT tokens have expiration times
   - ✅ Role-based access control (RBAC) implemented
   - ✅ Protected routes require authentication

3. **Database Security**
   - ✅ Use SSL/TLS for database connections
   - ✅ Connection pooling to prevent exhaustion
   - ✅ Parameterized queries to prevent SQL injection
   - ✅ Database credentials stored securely

4. **API Security**
   - ✅ CORS configured for specific origins
   - ✅ Input validation on all endpoints
   - ✅ Rate limiting (recommended for production)
   - ✅ Error messages don't expose sensitive information

5. **Code Security**
   - ✅ Dependencies regularly updated
   - ✅ No hardcoded secrets or credentials
   - ✅ Security headers configured
   - ✅ Regular security audits

### Security Checklist

- [ ] All environment variables set securely
- [ ] Strong JWT secret configured
- [ ] Database credentials secured
- [ ] CORS origins restricted to production URLs
- [ ] SSL/TLS enabled for all services
- [ ] Error logging configured (without exposing secrets)
- [ ] Regular dependency updates scheduled

---

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - User logout

### User Management

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `POST /api/users/:id/approve` - Approve user (admin)

### Course Management

- `GET /api/courses` - Get all courses
- `GET /api/courses/:id` - Get course by ID
- `GET /api/section-courses` - Get section courses

### Assessment & Grading

- `GET /api/assessments` - Get assessments
- `POST /api/assessments` - Create assessment
- `GET /api/grades` - Get grades
- `POST /api/grades` - Submit grades

### Analytics

- `GET /api/analytics/students` - Get student analytics
- `POST /api/cluster` - Perform student clustering (via Python API)

### Health Check

- `GET /api/health` - API health status

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the Repository**
2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Follow the existing code style
   - Write clear commit messages
   - Add comments for complex logic

4. **Test Your Changes**
   - Test locally before submitting
   - Ensure no breaking changes
   - Check for linting errors

5. **Submit a Pull Request**
   - Provide a clear description
   - Reference any related issues
   - Ensure CI checks pass

### Code Style

- Use ESLint for JavaScript/React code
- Follow existing naming conventions
- Write self-documenting code
- Add JSDoc comments for functions

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🆘 Support

For issues, questions, or contributions:

1. Check existing [Issues](../../issues)
2. Create a new issue with detailed information
3. Contact the development team

---

## 🎉 Acknowledgments

- Built with modern web technologies
- Designed for educational institutions
- Optimized for production deployment

---

**Made with ❤️ for better education management**
