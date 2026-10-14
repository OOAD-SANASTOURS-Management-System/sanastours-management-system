import React from 'react';

const Sidebar = ({ currentView, setCurrentView }) => {
  const links = [
    { name: 'Dashboard', path: '/' },
    { name: 'Customers', path: '/customers' },
    { name: 'Inquiries', path: '/inquiries' },
    { name: 'Tour Packages', path: '/tour-packages' },
    // The Itineraries tab was removed: an itinerary belongs to one tour
    // package, so it is viewed and edited inside that package.
    { name: 'Quotations', path: '/quotations' },
    { name: 'Bookings', path: '/bookings' },
    { name: 'Payments', path: '/payments' },
    { name: 'Vehicles', path: '/vehicles' },
    { name: 'Drivers', path: '/drivers' },
    { name: 'Feedback', path: '/feedback' },
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
              <button
                onClick={() => setCurrentView(link.path)}
                className={`w-full text-left block px-6 py-3 text-sm font-medium ${
                  currentView === link.path
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                {link.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-6 mt-auto">
        <button className="text-sm font-medium text-gray-300 hover:text-white" onClick={() => {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          window.location.href = '/';
        }}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
