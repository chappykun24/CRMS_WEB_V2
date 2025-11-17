/**
 * Shared cluster utilities for consistent clustering analytics across all interfaces
 * This ensures dean and faculty interfaces use the same labels, colors, and styling
 */

/**
 * Cluster color mapping for scatter plots and charts
 * These colors must match the getClusterStyle function below
 */
export const clusterColors = {
  'Excellent Performance': '#10b981', // emerald-500 (green)
  'Average Performance': '#3b82f6',  // blue-500 (blue)
  'Performing Well': '#3b82f6',      // blue-500 (blue) - alias for Average Performance
  'On Track': '#3b82f6',              // blue-500 (blue) - legacy alias for Average Performance
  'Needs Improvement': '#f59e0b',     // amber-500 (orange)
  'Needs Guidance': '#f59e0b',        // amber-500 (orange) - alias for Needs Improvement
  'At Risk': '#ef4444',               // red-500 (red)
  'Needs Support': '#ef4444'          // red-500 (red) - alias for At Risk
};

/**
 * Get cluster style for table badges
 * Returns an object with text and className for styling cluster labels
 * @param {string} label - The cluster label from the backend
 * @returns {Object|null} - { text: string, className: string } or null if invalid
 */
export const getClusterStyle = (label) => {
  // Return null if no valid cluster label (don't show "Not Clustered" fallback)
  if (!label || 
      label === null || 
      label === undefined ||
      (typeof label === 'number' && isNaN(label)) ||
      (typeof label === 'string' && (label.toLowerCase() === 'nan' || label.trim() === ''))) {
    return null; // Return null instead of fallback text
  }

  const normalized = String(label).toLowerCase();

  // At Risk - Red (check first to avoid matching "risk" in other contexts)
  if (normalized.includes('risk') || normalized.includes('at risk') || normalized.includes('needs support')) {
    return { text: label, className: 'bg-red-100 text-red-700' };
  }

  // Needs Improvement/Needs Guidance - Orange/Yellow
  // Check for "improvement" and "guidance" first
  if (normalized.includes('improvement') || normalized.includes('guidance')) {
    return { text: label, className: 'bg-orange-100 text-orange-700' };
  }
  
  // Check for "needs" separately (but not "needs support" which is already handled as At Risk)
  if (normalized.includes('needs') && !normalized.includes('support')) {
    return { text: label, className: 'bg-orange-100 text-orange-700' };
  }

  // Average Performance/Performing Well/On Track - Blue (check before Excellent to avoid matching "performance")
  if (normalized.includes('average') || normalized.includes('performing') || normalized.includes('track') || normalized.includes('on track')) {
    return { text: label, className: 'bg-blue-100 text-blue-700' };
  }

  // Excellent Performance - Green (check after Average to avoid conflicts)
  if (normalized.includes('excellent') || normalized.includes('high')) {
    return { text: label, className: 'bg-emerald-100 text-emerald-700' };
  }

  // Default - Gray
  return { text: label, className: 'bg-gray-100 text-gray-600' };
};

/**
 * Get cluster color for a given cluster label
 * Used for scatter plots and charts
 * Uses the same logic as getClusterStyle to ensure consistency
 * @param {string} label - The cluster label
 * @returns {string} - Hex color code or default gray
 */
export const getClusterColor = (label) => {
  if (!label || 
      label === null || 
      label === undefined ||
      (typeof label === 'number' && isNaN(label)) ||
      (typeof label === 'string' && (label.toLowerCase() === 'nan' || label.trim() === ''))) {
    return '#9ca3af'; // gray-400
  }
  
  // Try exact match first (most reliable)
  const trimmed = String(label).trim();
  if (clusterColors[trimmed]) {
    return clusterColors[trimmed];
  }
  
  // Normalize the label for keyword matching
  const normalized = String(label).toLowerCase().trim();
  
  // Case-insensitive exact match
  for (const [key, color] of Object.entries(clusterColors)) {
    if (key.toLowerCase() === normalized) {
      return color;
    }
  }
  
  // At Risk - Red (check first to avoid matching "risk" in other contexts)
  if (normalized.includes('risk') || normalized.includes('at risk') || normalized.includes('needs support')) {
    return '#ef4444'; // red-500
  }
  
  // Needs Improvement/Needs Guidance - Orange (check before "needs" to avoid matching "needs support")
  if (normalized.includes('improvement') || normalized.includes('guidance')) {
    return '#f59e0b'; // amber-500 (orange)
  }
  
  // Check for "needs" separately (but not "needs support" which is already handled)
  if (normalized.includes('needs') && !normalized.includes('support')) {
    return '#f59e0b'; // amber-500 (orange)
  }
  
  // Average Performance/Performing Well/On Track - Blue (check before Excellent to avoid matching "performance")
  if (normalized.includes('average') || normalized.includes('performing') || normalized.includes('track') || normalized.includes('on track')) {
    return '#3b82f6'; // blue-500
  }
  
  // Excellent Performance - Green (check after Average to avoid conflicts)
  if (normalized.includes('excellent') || normalized.includes('high')) {
    return '#10b981'; // emerald-500 (green)
  }
  
  // Default - Gray
  return '#9ca3af'; // gray-400
};

/**
 * Normalize cluster label to standard format
 * Maps various label formats to standard cluster names
 * @param {string} label - The cluster label from backend
 * @returns {string} - Normalized cluster label
 */
export const normalizeClusterLabel = (label) => {
  if (!label || 
      label === null || 
      label === undefined ||
      (typeof label === 'number' && isNaN(label)) ||
      (typeof label === 'string' && (label.toLowerCase() === 'nan' || label.trim() === ''))) {
    return null;
  }

  const normalized = String(label).toLowerCase().trim();

  // At Risk variations
  if (normalized.includes('risk') || normalized.includes('at risk') || normalized.includes('needs support')) {
    return 'At Risk';
  }

  // Needs Improvement variations
  if (normalized.includes('improvement') || normalized.includes('guidance')) {
    return 'Needs Improvement';
  }

  // Average Performance variations
  if (normalized.includes('average') || normalized.includes('performing') || normalized.includes('track') || normalized.includes('on track')) {
    return 'Average Performance';
  }

  // Excellent Performance variations
  if (normalized.includes('excellent') || normalized.includes('high')) {
    return 'Excellent Performance';
  }

  // Return original if no match
  return label;
};

/**
 * Get submission status score style (HIGHER IS BETTER)
 * Score range: 0.0-2.0 where:
 * - 2.0 = all ontime (BEST - green)
 * - 1.0 = all late (moderate - yellow)
 * - 0.0 = all missing (WORST - red)
 * @param {number} score - The submission_status_score value
 * @returns {Object|null} - { text: string, className: string, label: string } or null if invalid
 */
export const getSubmissionStatusScoreStyle = (score) => {
  if (score === null || score === undefined || isNaN(score)) {
    return null;
  }

  const numScore = parseFloat(score);
  
  // 1.5-2.0: Excellent (mostly ontime) - Green
  if (numScore >= 1.5) {
    return { 
      text: numScore.toFixed(2), 
      className: 'bg-green-100 text-green-700 font-medium',
      label: 'Excellent' 
    };
  }
  
  // 0.5-1.5: Moderate (mix or mostly late) - Yellow/Orange
  if (numScore >= 0.5) {
    return { 
      text: numScore.toFixed(2), 
      className: 'bg-yellow-100 text-yellow-700 font-medium',
      label: 'Moderate' 
    };
  }
  
  // 0.0-0.5: Poor (mostly missing) - Red
  return { 
    text: numScore.toFixed(2), 
    className: 'bg-red-100 text-red-700 font-medium',
    label: 'Poor' 
  };
};

