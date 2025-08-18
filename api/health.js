module.exports = (req, res) => {
  if (req.method === 'GET') {
    try {
      console.log('🔍 [HEALTH API] Health check requested');
      
      res.status(200).json({ 
        status: 'healthy', 
        message: 'API is working (database connection test disabled for now)',
        timestamp: new Date().toISOString(),
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
};
