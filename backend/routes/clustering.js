const express = require('express');
const router = express.Router();
const clusteringService = require('../services/clusteringService');

/**
 * GET /api/clustering/visualization-data
 * Returns data formatted for cluster visualization
 */
router.get('/visualization-data', async (req, res) => {
  try {
    const { term_id, section_id, section_course_id, limit = 200 } = req.query;
    
    // Get student data (similar to dean-analytics endpoint)
    // This would need to fetch from the same query as assessments.js
    // For now, we'll return a structure that the frontend can use
    
    res.json({
      success: true,
      message: 'Use /api/assessments/dean-analytics/sample endpoint and extract visualization data from response',
      note: 'Visualization data is included in the clustering results'
    });
  } catch (error) {
    console.error('[Clustering] Error getting visualization data:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

