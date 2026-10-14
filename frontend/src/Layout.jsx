import React from 'react';
import Sidebar from './components/Sidebar';

const Layout = ({ children, currentView, setCurrentView }) => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="ml-64 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  );
};

export default Layout;
