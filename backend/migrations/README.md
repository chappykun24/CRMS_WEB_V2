# Migration: Remove submitted_at, Add submission_status

## Overview
This migration removes the `submitted_at` timestamp column and replaces it with `submission_status` (ontime, late, missing) for button-based submission tracking.

## Quick Start

### Run Migration
```bash
cd backend
npm run migrate
```

### Or using Node.js directly
```bash
node backend/scripts/run_migration.js
```

## What Changes

- **Removed**: `submitted_at TIMESTAMP` column
- **Added**: `submission_status VARCHAR(20)` column (values: 'ontime', 'late', 'missing')
- **Data Migration**: Existing timestamps are converted to status values
- **Code Updates**: All backend routes, analytics, and clustering updated

## Migration Files

- `remove_submitted_at_complete.sql` - Complete migration (recommended)
- `run_migration.js` - Automated migration script

## Verification

After migration, the script automatically verifies:
- ✅ `submitted_at` column removed
- ✅ `submission_status` column exists
- ✅ Data migrated correctly
- ✅ Index created

## Important Notes

1. **Backup your database first**
2. **Test in development** before production
3. **Original timestamps cannot be recovered** after removal
4. **Frontend already updated** to use status buttons

## Troubleshooting

- **Connection errors**: Check environment variables (NEON_HOST, NEON_DATABASE, etc.)
- **Permission errors**: Ensure database user has ALTER TABLE permissions
- **Migration fails**: Review error messages and check database logs

