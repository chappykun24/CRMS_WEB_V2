# CRMS Backend API

This is the backend API server for the Class Record Management System (CRMS) deployed on Render.

## Environment Variables

Set these environment variables in your Render dashboard:

### Database (Neon PostgreSQL)
- `NEON_HOST` - Your Neon database host
- `NEON_DATABASE` - Your Neon database name
- `NEON_USER` - Your Neon database username
- `NEON_PASSWORD` - Your Neon database password
- `NEON_PORT` - Your Neon database port (default: 5432)

### Application
- `NODE_ENV` - Set to "production" for production deployment
- `FRONTEND_URL` - Your frontend URL for CORS (e.g., https://your-app.vercel.app)

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/users` - Get all users
- `GET /api/departments` - Get all departments
- `GET /api/school-terms` - Get all school terms
- `GET /api/programs` - Get all programs
- `GET /api/program-specializations` - Get all specializations
- `GET /api/courses` - Get all courses
- `GET /api/section-courses` - Get all section courses

## Local Development

```bash
npm install
npm run dev
```

## Production

```bash
npm start
```

## Deployment

This backend is configured for deployment on Render as a Web Service.
