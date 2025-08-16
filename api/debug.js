export default async function handler(req, res) {
  console.log('🔍 [DEBUG] Request received:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('🔍 [DEBUG] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  try {
    console.log('🔍 [DEBUG] Processing request...');
    
    // Check environment variables
    const envCheck = {
      NEON_HOST: process.env.VITE_NEON_HOST || 'NOT SET',
      NEON_DATABASE: process.env.VITE_NEON_DATABASE || 'NOT SET',
      NEON_USER: process.env.VITE_NEON_USER || 'NOT SET',
      NEON_PASSWORD: process.env.VITE_NEON_PASSWORD ? 'SET (hidden)' : 'NOT SET',
      NEON_PORT: process.env.VITE_NEON_PORT || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    };

    console.log('🔍 [DEBUG] Environment variables check:', envCheck);

    // Simple response without database connection
    const response = {
      success: true,
      message: 'Debug endpoint working',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      method: req.method,
      headers: req.headers
    };

    console.log('🔍 [DEBUG] Sending response:', response);
    res.status(200).json(response);
    console.log('🔍 [DEBUG] Response sent successfully');

  } catch (error) {
    console.error('❌ [DEBUG] Error occurred:', error);
    const errorResponse = { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
    console.log('❌ [DEBUG] Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
  }
}
