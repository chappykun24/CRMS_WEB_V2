/**
 * Database Migration Script
 * 
 * This script executes the migration to remove submitted_at and use submission_status
 * 
 * Usage: node backend/scripts/run_migration.js [--dry-run]
 * 
 * Options:
 *   --dry-run    : Show what would be executed without actually running it
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (msg) => console.log(`\n${colors.cyan}▶${colors.reset} ${msg}`)
};

// Read SQL file
const readSQLFile = (filePath) => {
  try {
    const fullPath = path.join(__dirname, '..', 'migrations', filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${fullPath}`);
    }
    return fs.readFileSync(fullPath, 'utf8');
  } catch (error) {
    log.error(`Failed to read SQL file: ${error.message}`);
    throw error;
  }
};

// Execute SQL with transaction
const executeSQL = async (sql, description) => {
  log.step(`Executing: ${description}`);
  
  if (dryRun) {
    log.warning('DRY RUN MODE - SQL will not be executed');
    console.log('\n' + '─'.repeat(80));
    console.log(sql.substring(0, 500) + (sql.length > 500 ? '...\n[truncated]' : ''));
    console.log('─'.repeat(80) + '\n');
    return { success: true, dryRun: true };
  }

  try {
    // Use the database transaction method
    await db.transaction(async (client) => {
      // For PostgreSQL, we can execute SQL with multiple statements
      // But pg library requires one statement at a time, so we need to split
      // Use a simpler approach: split by semicolon, but preserve CASE statements
      
      // First, remove comment-only lines and clean up
      const lines = sql.split('\n');
      const cleanedLines = lines
        .map(line => {
          // Remove full-line comments
          const trimmed = line.trim();
          if (trimmed.startsWith('--') && !trimmed.includes('CHECK')) {
            return '';
          }
          return line;
        })
        .filter(line => line.trim().length > 0);
      
      const cleanedSQL = cleanedLines.join('\n');
      
      // Split by semicolon, but be smarter about it
      // PostgreSQL allows multiple statements separated by semicolons
      // We'll split and execute each statement separately for better error handling
      const statements = cleanedSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => {
          // Remove empty statements and comment-only statements
          const trimmed = s.trim();
          return trimmed.length > 0 && 
                 !trimmed.match(/^--/) &&
                 trimmed !== '';
        });

      log.info(`Executing ${statements.length} SQL statements...`);
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim()) {
          try {
            // Execute each statement
            await client.query(statement);
            if (statements.length > 1) {
              log.info(`  ✓ Statement ${i + 1}/${statements.length} completed`);
            }
          } catch (error) {
            log.error(`✗ Failed on statement ${i + 1}/${statements.length}`);
            log.error(`Error: ${error.message}`);
            if (error.code) {
              log.error(`Error code: ${error.code}`);
            }
            // Show a preview of the failing statement
            const preview = statement.substring(0, 150).replace(/\s+/g, ' ');
            log.error(`Statement preview: ${preview}...`);
            throw error;
          }
        }
      }
    });
    
    log.success(`${description} completed successfully`);
    return { success: true };
  } catch (error) {
    log.error(`Failed to execute SQL: ${error.message}`);
    if (error.code) {
      log.error(`Error code: ${error.code}`);
    }
    throw error;
  }
};

// Verify migration
const verifyMigration = async () => {
  log.step('Verifying migration...');
  
  try {
    // Check submitted_at is removed
    const checkSubmittedAt = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' AND column_name = 'submitted_at'
    `);
    
    if (checkSubmittedAt.rows.length > 0) {
      log.warning('submitted_at column still exists');
      return false;
    } else {
      log.success('submitted_at column removed');
    }

    // Check submission_status exists
    const checkSubmissionStatus = await db.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'submissions' AND column_name = 'submission_status'
    `);
    
    if (checkSubmissionStatus.rows.length === 0) {
      log.error('submission_status column not found');
      return false;
    } else {
      log.success('submission_status column exists');
      const col = checkSubmissionStatus.rows[0];
      log.info(`  Type: ${col.data_type}, Default: ${col.column_default}`);
    }

    // Check index exists
    const checkIndex = await db.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'submissions' 
      AND indexname = 'idx_submissions_submission_status'
    `);
    
    if (checkIndex.rows.length === 0) {
      log.warning('idx_submissions_submission_status index not found');
    } else {
      log.success('idx_submissions_submission_status index exists');
    }

    // Check data distribution
    const checkDistribution = await db.query(`
      SELECT submission_status, COUNT(*) as count 
      FROM submissions 
      GROUP BY submission_status 
      ORDER BY submission_status
    `);
    
    if (checkDistribution.rows.length > 0) {
      log.success('Submission status distribution:');
      checkDistribution.rows.forEach(row => {
        log.info(`  ${row.submission_status}: ${row.count} records`);
      });
    } else {
      log.warning('No submission status data found');
    }

    return true;
  } catch (error) {
    log.error(`Verification failed: ${error.message}`);
    return false;
  }
};

// Main execution
const main = async () => {
  console.log('\n' + '='.repeat(80));
  console.log('  Database Migration: Remove submitted_at, Use submission_status');
  console.log('='.repeat(80));
  
  if (dryRun) {
    log.warning('DRY RUN MODE - No changes will be made to the database');
  }
  
  log.info(`Dry run: ${dryRun ? 'Yes' : 'No'}`);
  
  try {
    // Test database connection
    log.step('Testing database connection...');
    await db.query('SELECT 1');
    log.success('Database connection successful');

    // Run complete migration
    log.step('Running complete migration');
    const migrationSQL = readSQLFile('remove_submitted_at_complete.sql');
    await executeSQL(migrationSQL, 'Complete migration (add submission_status, migrate data, remove submitted_at)');

    // Verify migration
    if (!dryRun) {
      const verified = await verifyMigration();
      if (verified) {
        log.success('\n✅ Migration completed and verified successfully!');
      } else {
        log.error('\n❌ Migration completed but verification failed');
        process.exit(1);
      }
    } else {
      log.warning('\n⚠️  Dry run completed - no changes were made');
    }

  } catch (error) {
    log.error(`\n❌ Migration failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    try {
      await db.close();
    } catch (error) {
      // Ignore connection close errors
      log.warning('Error closing database connection (non-critical)');
    }
  }
};

// Run the script
main().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});

