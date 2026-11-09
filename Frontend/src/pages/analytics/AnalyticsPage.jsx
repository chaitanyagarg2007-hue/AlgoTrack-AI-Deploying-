import React from 'react';

const AnalyticsPage = () => {
  return (
    <div className="animate-fade-in">
      <h1>Deep Analytics</h1>
      <p className="mt-2 text-gray-400">Detailed rating history and topic breakdowns will appear here.</p>
      
      <div className="card mt-6">
        <div className="skeleton" style={{ height: '300px', width: '100%' }}></div>
        <p className="text-center text-sm text-gray-500 mt-4">Chart placeholder</p>
      </div>
    </div>
  );
};

export default AnalyticsPage;
