export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Check environment variables
    const envCheck = {
      NEON_HOST: process.env.VITE_NEON_HOST || 'NOT SET',
      NEON_DATABASE: process.env.VITE_NEON_DATABASE || 'NOT SET',
      NEON_USER: process.env.VITE_NEON_USER || 'NOT SET',
      NEON_PASSWORD: process.env.VITE_NEON_PASSWORD ? 'SET (hidden)' : 'NOT SET',
      NEON_PORT: process.env.VITE_NEON_PORT || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    };

    // Simple response without database connection
    res.status(200).json({
      success: true,
      message: 'Debug endpoint working',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      method: req.method,
      headers: req.headers
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
}
