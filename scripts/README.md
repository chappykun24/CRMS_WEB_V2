# CRMS Database Setup

Simple script to set up the CRMS v2 database on Neon (PostgreSQL).

## Quick Start

### 1. Install Dependencies
```bash
cd scripts
npm install
```

### 2. Set Environment Variables
Create a `.env` file:
```bash
NEON_DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

### 3. Run Setup
```bash
npm run setup
```

## What Gets Created

- **Tables**: `roles`, `users`, `user_profiles`
- **Roles**: ADMIN, FACULTY, DEAN, STAFF, PROGRAM_CHAIR
- **Users**: 5 test users with placeholder passwords
- **Profiles**: Basic user profile information

## Important Notes

- Update placeholder password hashes with real bcrypt hashes before production
- Make sure your Neon database URL is correct
- SSL is automatically enabled for Neon

## Troubleshooting

- **Connection failed**: Check your Neon database URL
- **Permission denied**: Ensure your user has CREATE TABLE permissions
- **SSL error**: Neon requires SSL (handled automatically)
