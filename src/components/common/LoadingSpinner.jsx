import React from 'react';

const LoadingSpinner = ({ fullScreen, size = 'md', text }) => {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 flex flex-col items-center justify-center z-50">
        <div className={`${sizes.lg} border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin`} />
        <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm font-medium">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizes[size]} border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin`} />
      {text && <p className="mt-3 text-gray-500 text-sm">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
