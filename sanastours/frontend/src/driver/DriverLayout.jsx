import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const DriverSidebar = () => {
  
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const links = [
    { name: 'Dashboard', path: '/driver' },
    { name: 'My Tours', path: '/driver/tours' },
    { name: 'My Profile', path: '/driver/profile' },
  ];

  return (
    <div className="w-64 bg-[#1a1a1a] text-white flex flex-col h-screen fixed top-0 left-0 z-20">
      <div className="p-6 text-xl font-bold border-b border-gray-800">
        SANAS <span className="text-orange-500">TOURS</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
        <ul>
          {links.map((link) => (
            <li key={link.name}>
              <NavLink
                to={link.path}
                end={link.path === '/driver'}
                className={({ isActive }) => 
                  `w-full text-left block px-6 py-3 text-sm font-medium ${
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                {link.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-6 mt-auto">
        <button 
          className="text-sm font-medium text-gray-300 hover:text-white w-full text-left" 
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

const DriverLayout = () => {
  return (
    <div className="bg-gray-50 min-h-screen">
      <DriverSidebar />
      <div className="ml-64 flex flex-col min-h-screen">
        <Outlet />
      </div>
    </div>
  );
};

export default DriverLayout;
