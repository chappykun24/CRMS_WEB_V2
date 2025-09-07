import React from 'react';
import { BuildingOfficeIcon } from '@heroicons/react/24/solid';

const DepartmentAccessIndicator = ({ userDepartment, className = '' }) => {
  if (!userDepartment) {
    return null;
  }

  // Show warning when user has no department access
  if (userDepartment.noAccess) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center gap-2">
          <BuildingOfficeIcon className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              No Department Access
            </p>
            <p className="text-xs text-red-700">
              You need to be assigned to a department to access data. Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show department access info
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2">
        <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Department Access: {userDepartment.name}
          </p>
          <p className="text-xs text-blue-700">
            You can only view and manage data from this department
          </p>
        </div>
      </div>
    </div>
  );
};

export default DepartmentAccessIndicator;
