# Development Setup Guide

## Local Development Configuration

### 1. Environment Variables Setup

Create a `.env.local` file in your project root with the following variables:

```bash
# Neon Database Configuration
VITE_NEON_HOST=your-neon-host.neon.tech
VITE_NEON_DATABASE=your-database-name
VITE_NEON_USER=your-username
VITE_NEON_PASSWORD=your-password
VITE_NEON_PORT=5432

# Backend Server Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:3001/api
```

### 2. Local Development Commands

```bash
# Terminal 1: Start Backend Server
npm run dev:backend

# Terminal 2: Start Frontend Development Server
npm run dev:frontend

# Or run both together
npm run dev:full
```

### 3. Database Connection Test

Test your local database connection:

```bash
npm run db:test
```

## Production Deployment

### 1. Vercel Environment Variables

Set these in your Vercel dashboard:

```bash
NEON_HOST=your-neon-host.neon.tech
NEON_DATABASE=your-database-name
NEON_USER=your-username
NEON_PASSWORD=your-password
NEON_PORT=5432
NODE_ENV=production
```

### 2. Deploy Commands

```bash
# Deploy to staging
vercel

# Deploy to production
vercel --prod
```

## How It Works

- **Local Development**: Frontend connects to `http://localhost:3001/api`
- **Production**: Frontend connects to `/api` (routed to Vercel serverless function)
- **Database**: Same Neon database used in both environments
- **Environment Detection**: Automatically switches based on `NODE_ENV`
