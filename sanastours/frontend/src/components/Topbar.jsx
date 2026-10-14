import React from 'react';

const Topbar = ({ title, subtitle }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-8 py-6 flex justify-between items-center sticky top-0 z-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-gray-500 mt-1 text-sm">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-4">
        {/* Profile info or actions can go here */}
      </div>
    </div>
  );
};

export default Topbar;
