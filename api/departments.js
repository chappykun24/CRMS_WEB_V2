module.exports = (req, res) => {
  console.log('🔍 [DEPARTMENTS API] Request received:', {
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
      const mockDepartments = [
        { department_id: 1, name: 'Computer Science', department_abbreviation: 'CS' },
        { department_id: 2, name: 'Information Technology', department_abbreviation: 'IT' }
      ];
      
      res.status(200).json(mockDepartments);
      
    } else if (req.method === 'POST') {
      // Mock create response
      res.status(201).json({ 
        department_id: Date.now(), 
        name: req.body.name, 
        department_abbreviation: req.body.department_abbreviation 
      });
      
    } else if (req.method === 'PUT') {
      // Mock update response
      res.status(200).json({ 
        department_id: req.query.id, 
        name: req.body.name, 
        department_abbreviation: req.body.department_abbreviation 
      });
      
    } else if (req.method === 'DELETE') {
      // Mock delete response
      res.status(200).json({ message: 'Department deleted successfully' });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
    
  } catch (error) {
    console.error('❌ [DEPARTMENTS API] Error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
