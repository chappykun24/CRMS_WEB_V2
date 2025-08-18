import { Pool } from 'pg'

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    if (!id) {
      return res.status(400).json({ error: 'Missing user id' })
    }

    const required = ['VITE_NEON_HOST', 'VITE_NEON_DATABASE', 'VITE_NEON_USER', 'VITE_NEON_PASSWORD']
    const missing = required.filter((k) => !process.env[k])
    if (missing.length) {
      return res.status(500).json({ error: `Missing environment variables: ${missing.join(', ')}` })
    }

    const connectionString = `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`
    const pool = new Pool({ connectionString, ssl: true, max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000 })

    const update = await pool.query('UPDATE users SET is_approved = TRUE, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING user_id', [id])
    if (update.rowCount === 0) {
      await pool.end()
      return res.status(404).json({ error: 'User not found' })
    }

    await pool.query('INSERT INTO user_approvals (user_id, approval_note) VALUES ($1, $2)', [id, 'Approved by admin'])
    await pool.end()
    return res.status(200).json({ success: true, userId: id, isApproved: true })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}


