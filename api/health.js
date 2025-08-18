import { query } from '../../src/config/database.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      console.log('🔍 [HEALTH API] Health check requested');
      
      // Test database connection
      const result = await query('SELECT NOW()');
      
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
