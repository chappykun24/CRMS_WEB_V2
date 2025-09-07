import React from 'react';

const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = 'Loading...',
  fullScreen = false 
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    green: 'border-green-600',
    red: 'border-red-600',
    yellow: 'border-yellow-600',
    gray: 'border-gray-600',
    white: 'border-white'
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div 
        className={`animate-spin rounded-full border-b-2 ${sizeClasses[size]} ${colorClasses[color]}`}
      ></div>
      {text && (
        <p className="text-sm text-gray-600 animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

// Predefined loading components for common use cases
export const PageLoading = () => (
  <LoadingSpinner 
    size="xl" 
    color="blue" 
    text="Loading page..." 
    fullScreen 
  />
);

export const ButtonLoading = ({ text = 'Loading...' }) => (
  <LoadingSpinner 
    size="sm" 
    color="white" 
    text={text} 
  />
);

export const CardLoading = () => (
  <div className="p-6">
    <LoadingSpinner 
      size="lg" 
      color="blue" 
      text="Loading data..." 
    />
  </div>
);

export const TableLoading = () => (
  <div className="flex justify-center py-8">
    <LoadingSpinner 
      size="md" 
      color="blue" 
      text="Loading table..." 
    />
  </div>
);

export default LoadingSpinner;
