import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.VITE_NEON_DATABASE_URL || `postgresql://${process.env.VITE_NEON_USER}:${process.env.VITE_NEON_PASSWORD}@${process.env.VITE_NEON_HOST}:${process.env.VITE_NEON_PORT || 5432}/${process.env.VITE_NEON_DATABASE}?sslmode=require`,
  ssl: true,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const client = await pool.connect();
    client.release();
    res.status(200).json({ status: 'healthy', message: 'Database connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  } finally {
    await pool.end();
  }
}
