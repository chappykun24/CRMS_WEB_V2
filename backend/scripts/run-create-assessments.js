import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Database connection string (Neon format)
// Example: postgresql://user:password@host/dbname?sslmode=require
const DATABASE_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL or NEON_DATABASE_URL environment variable is not set')
  console.log('\n📝 Usage:')
  console.log('   Set environment variable:')
  console.log('   export DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"')
  console.log('   npm run create-assessments\n')
  process.exit(1)
}

// Update the create-assessments.js script to use this DATABASE_URL
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  try {
    console.log('🚀 Starting assessment creation...')
    console.log(`📊 Using database: ${DATABASE_URL.split('@')[1]?.split('/')[0] || 'connected'}\n`)
    
    // Set environment variable for the child script
    process.env.DATABASE_URL = DATABASE_URL
    
    // Parse DATABASE_URL to set individual vars for compatibility
    const url = new URL(DATABASE_URL)
    process.env.NEON_HOST = url.hostname
    process.env.NEON_PORT = url.port || '5432'
    process.env.NEON_DATABASE = url.pathname.slice(1)
    process.env.NEON_USER = url.username
    process.env.NEON_PASSWORD = url.password
    process.env.NODE_ENV = 'production' // Use SSL
    
    // Now run the actual script
    const { stdout, stderr } = await execAsync('node scripts/create-assessments.js', {
      cwd: __dirname,
      env: process.env
    })
    
    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)
    
  } catch (error) {
    console.error('❌ Error running script:', error.message)
    if (error.stdout) console.log(error.stdout)
    if (error.stderr) console.error(error.stderr)
    process.exit(1)
  }
}

main()

