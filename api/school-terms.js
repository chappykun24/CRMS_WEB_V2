export default async function handler(req, res) {
  console.log('🔍 [SCHOOL TERMS API] Request received:', {
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      // For now, return mock data to test deployment
      const mockTerms = [
        { 
          term_id: 1, 
          school_year: '2024-2025', 
          semester: '1st', 
          start_date: '2024-08-01', 
          end_date: '2024-12-15', 
          is_active: true 
        },
        { 
          term_id: 2, 
          school_year: '2024-2025', 
          semester: '2nd', 
          start_date: '2025-01-15', 
          end_date: '2025-05-30', 
          is_active: false 
        }
      ];
      
      res.status(200).json(mockTerms);
      
    } else if (req.method === 'POST') {
      // Mock create response
      res.status(201).json({ 
        term_id: Date.now(), 
        school_year: req.body.school_year, 
        semester: req.body.semester,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        is_active: req.body.is_active || false
      });
      
    } else if (req.method === 'PUT') {
      // Mock update response
      res.status(200).json({ 
        term_id: req.query.id, 
        school_year: req.body.school_year, 
        semester: req.body.semester,
        start_date: req.body.start_date,
        end_date: req.body.end_date,
        is_active: req.body.is_active
      });
      
    } else if (req.method === 'DELETE') {
      // Mock delete response
      res.status(200).json({ message: 'School term deleted successfully' });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    
  } catch (error) {
    console.error('❌ [SCHOOL TERMS API] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
