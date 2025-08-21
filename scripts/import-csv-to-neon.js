import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import pkg from 'pg'

const { Pool } = pkg

// Load env (.env.local preferred)
dotenv.config({ path: path.join(process.cwd(), '.env.local') })
dotenv.config()

function getConnectionString() {
  const url = process.env.DATABASE_URL || (
    process.env.NEON_USER && process.env.NEON_PASSWORD && process.env.NEON_HOST && process.env.NEON_DATABASE
      ? `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`
      : null
  )
  if (!url) {
    throw new Error('Missing DATABASE_URL or NEON_* env vars for Neon connection')
  }
  return url
}

const pool = new Pool({
  connectionString: getConnectionString(),
  ssl: { rejectUnauthorized: false }
})

function splitCSVLine(line) {
  // Split by commas not inside quotes
  const parts = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      // handle escaped quotes "" inside quoted field
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (ch === ',' && !inQuotes) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  parts.push(current)
  return parts.map(v => {
    const trimmed = v.trim()
    if (trimmed === '') return null
    // remove surrounding quotes if present
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      return trimmed.slice(1, -1)
    }
    return trimmed
  })
}

function parseCSV(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return { headers: [], rows: [] }
  const headers = splitCSVLine(lines[0]).map(h => String(h || '').replace(/^"|"$/g, ''))
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i])
    if (cols.length === 1 && (cols[0] === null || cols[0] === '')) continue
    rows.push(cols)
  }
  return { headers, rows }
}

async function ensurePrereqs(client) {
  // departments (id=1) and terms (id 1..3) used by provided CSVs
  await client.query(`CREATE TABLE IF NOT EXISTS departments (department_id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, department_abbreviation VARCHAR(50) UNIQUE NOT NULL)`)
  await client.query(`CREATE TABLE IF NOT EXISTS programs (program_id SERIAL PRIMARY KEY, department_id INTEGER, name VARCHAR(255) NOT NULL, description TEXT, program_abbreviation VARCHAR(50) UNIQUE NOT NULL, FOREIGN KEY (department_id) REFERENCES departments(department_id) ON DELETE CASCADE)`)
  await client.query(`CREATE TABLE IF NOT EXISTS program_specializations (specialization_id SERIAL PRIMARY KEY, program_id INTEGER, name VARCHAR(255) NOT NULL, description TEXT, abbreviation VARCHAR(50) UNIQUE NOT NULL, FOREIGN KEY (program_id) REFERENCES programs(program_id) ON DELETE CASCADE)`)
  await client.query(`CREATE TABLE IF NOT EXISTS school_terms (term_id SERIAL PRIMARY KEY, school_year VARCHAR(50) NOT NULL, semester VARCHAR(10), start_date DATE, end_date DATE, is_active BOOLEAN DEFAULT FALSE)`)
  await client.query(`CREATE TABLE IF NOT EXISTS courses (course_id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, course_code VARCHAR(50) UNIQUE NOT NULL, description TEXT, term_id INTEGER, specialization_id INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (term_id) REFERENCES school_terms(term_id) ON DELETE SET NULL, FOREIGN KEY (specialization_id) REFERENCES program_specializations(specialization_id) ON DELETE SET NULL)`)

  // Upsert base department id=1 if not exists
  await client.query(`INSERT INTO departments(department_id, name, department_abbreviation) VALUES (1,'Computer Science','CS') ON CONFLICT (department_id) DO NOTHING`)
  // Ensure terms 1..3 exist
  await client.query(`INSERT INTO school_terms(term_id, school_year, semester, is_active) VALUES (1,'2024-2025','1st', true) ON CONFLICT (term_id) DO NOTHING`)
  await client.query(`INSERT INTO school_terms(term_id, school_year, semester, is_active) VALUES (2,'2024-2025','2nd', false) ON CONFLICT (term_id) DO NOTHING`)
  await client.query(`INSERT INTO school_terms(term_id, school_year, semester, is_active) VALUES (3,'2025-2026','1st', false) ON CONFLICT (term_id) DO NOTHING`)
}

async function importCSVToTable(client, filePath, table, columns, { onConflict = '' } = {}) {
  const { headers, rows } = parseCSV(filePath)
  // Build column indices mapping
  const idx = columns.map(col => headers.indexOf(col))
  if (idx.some(i => i === -1)) {
    throw new Error(`CSV ${path.basename(filePath)} missing required columns: ${columns.filter((c, k) => idx[k] === -1).join(', ')}`)
  }
  const colList = columns.map(c => '"' + c + '"').join(', ')
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
  const sql = `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ${onConflict}`
  for (const row of rows) {
    const values = idx.map(i => {
      let v = row[i]
      return v === undefined || v === null || v === '' ? null : v
    })
    await client.query(sql, values)
  }
}

async function fixSequences(client, table, idCol) {
  const seqSql = `SELECT setval(pg_get_serial_sequence('${table}','${idCol}'), COALESCE((SELECT MAX(${idCol}) FROM ${table}),0)+1, false)`
  await client.query(seqSql)
}

async function main() {
  const programsPath = process.argv[2]
  const specsPath = process.argv[3]
  const coursesPath = process.argv[4]

  if (!programsPath || !specsPath || !coursesPath) {
    console.error('Usage: node scripts/import-csv-to-neon.js <programs.csv> <program_specializations.csv> <courses.csv>')
    process.exit(1)
  }

  const client = await pool.connect()
  try {
    console.log('🔗 Connected to Neon')
    await client.query('BEGIN')
    await ensurePrereqs(client)

    console.log('📥 Importing programs...')
    await importCSVToTable(client, programsPath, 'programs', ['program_id','department_id','name','description','program_abbreviation'], { onConflict: 'ON CONFLICT (program_id) DO NOTHING' })
    await fixSequences(client, 'programs', 'program_id')

    console.log('📥 Importing program_specializations...')
    await importCSVToTable(client, specsPath, 'program_specializations', ['specialization_id','program_id','name','description','abbreviation'], { onConflict: 'ON CONFLICT (specialization_id) DO NOTHING' })
    await fixSequences(client, 'program_specializations', 'specialization_id')

    console.log('📥 Importing courses...')
    await importCSVToTable(client, coursesPath, 'courses', ['course_id','title','course_code','description','term_id','specialization_id','created_at','updated_at'], { onConflict: 'ON CONFLICT (course_id) DO NOTHING' })
    await fixSequences(client, 'courses', 'course_id')

    await client.query('COMMIT')
    console.log('✅ Import completed successfully')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Import failed:', err.message)
    process.exitCode = 1
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})


