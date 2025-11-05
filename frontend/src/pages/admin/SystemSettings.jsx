import React, { useEffect } from 'react';
import { prefetchAdminData } from '../../services/dataPrefetchService';

const SystemSettings = () => {
  // Prefetch data for other admin pages in the background
  useEffect(() => {
    setTimeout(() => {
      prefetchAdminData();
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Content removed */}
      </div>
    </div>
  );
};

export default SystemSettings; 