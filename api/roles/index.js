import { Pool } from 'pg'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const required = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD']
    const missing = required.filter((k) => !process.env[k])
    if (missing.length) {
      return res.status(500).json({ error: `Missing environment variables: ${missing.join(', ')}` })
    }
    const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`
    const pool = new Pool({ connectionString, ssl: true, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 })
    const result = await pool.query('SELECT role_id, name FROM roles ORDER BY name ASC')
    await pool.end()
    return res.status(200).json(result.rows)
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}


