import { Pool } from 'pg';

export default async function handler(req, res) {
  console.log('📸 [UPLOAD PHOTO] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('📸 [UPLOAD PHOTO] OPTIONS request, sending CORS response');
    res.status(200).end();
    return;
  }

  // Handle POST: upload profile photo
  if (req.method === 'POST') {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathParts = url.pathname.split('/').filter(Boolean);
      const idIndex = pathParts.indexOf('users') + 1;
      const userId = pathParts[idIndex];
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const { photoData } = req.body;

      if (!photoData) {
        return res.status(400).json({ 
          success: false, 
          error: 'No photo data provided' 
        });
      }

      // Validate base64 data format
      if (!photoData.startsWith('data:image/')) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid photo data format. Expected base64 image data.' 
        });
      }

      // Check base64 data size (approximately 1.33x larger than original file)
      // 5MB file = ~6.7MB base64 string
      const base64Size = Buffer.byteLength(photoData, 'utf8');
      const maxSize = 7 * 1024 * 1024; // 7MB limit for base64
      
      if (base64Size > maxSize) {
        return res.status(400).json({ 
          success: false, 
          error: 'Photo data too large. Please select a smaller image (max 5MB original file).' 
        });
      }

      // Check if environment variables are set
      const requiredEnvVars = ['NEON_HOST', 'NEON_DATABASE', 'NEON_USER', 'NEON_PASSWORD'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        console.log('❌ [UPLOAD PHOTO] Missing environment variables:', missingVars);
        return res.status(500).json({ 
          success: false, 
          error: `Missing environment variables: ${missingVars.join(', ')}`
        });
      }

      // Update user profile with base64 photo data
      const connectionString = `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}:${process.env.NEON_PORT || 5432}/${process.env.NEON_DATABASE}?sslmode=require`;
      const pool = new Pool({ 
        connectionString, 
        ssl: true, 
        max: 20, 
        idleTimeoutMillis: 30000, 
        connectionTimeoutMillis: 10000 
      });

      const result = await pool.query(`
        UPDATE users 
        SET profile_pic = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2 
        RETURNING user_id, profile_pic
      `, [photoData, userId]);

      await pool.end();

      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      console.log('✅ [UPLOAD PHOTO] Photo uploaded successfully for user:', userId);

      return res.status(200).json({
        success: true,
        message: 'Photo uploaded successfully',
        photoUrl: photoData,
        user: {
          id: result.rows[0].user_id,
          profilePic: result.rows[0].profile_pic
        }
      });

    } catch (error) {
      console.error('❌ [UPLOAD PHOTO] Error occurred:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }

  console.log('❌ [UPLOAD PHOTO] Invalid method:', req.method);
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
