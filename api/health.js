import pkg from 'pg';
const { Pool } = pkg;

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 [HEALTH API] Health check requested');
      
      // Create direct database connection for Vercel serverless
      const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
      
      const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 1, // Limit connections for serverless
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
      
      // Test database connection
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      await pool.end();
      
      res.status(200).json({ 
        status: 'healthy', 
        message: 'Database connected',
        timestamp: result.rows[0].now,
        environment: process.env.NODE_ENV || 'production'
      });
    } catch (error) {
      console.error('❌ [HEALTH API] Health check failed:', error);
      res.status(500).json({ 
        status: 'unhealthy', 
        error: error.message,
        environment: process.env.NODE_ENV || 'production'
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
