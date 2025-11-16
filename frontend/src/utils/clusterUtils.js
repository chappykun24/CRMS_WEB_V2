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

  // At Risk - Red
  if (normalized.includes('risk') || normalized.includes('at risk') || normalized.includes('needs support')) {
    return { text: label, className: 'bg-red-100 text-red-700' };
  }

  // Needs Improvement/Needs Guidance - Orange/Yellow
  if (normalized.includes('improvement') || normalized.includes('guidance') || normalized.includes('needs')) {
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
 * @param {string} label - The cluster label
 * @returns {string} - Hex color code or default gray
 */
export const getClusterColor = (label) => {
  if (!label) return '#9ca3af'; // gray-400
  
  // Normalize the label
  const normalized = String(label).trim();
  
  // Direct match first
  if (clusterColors[normalized]) {
    return clusterColors[normalized];
  }
  
  // Case-insensitive match
  const lowerLabel = normalized.toLowerCase();
  for (const [key, color] of Object.entries(clusterColors)) {
    if (key.toLowerCase() === lowerLabel) {
      return color;
    }
  }
  
  // Fallback to gray
  return '#9ca3af';
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

