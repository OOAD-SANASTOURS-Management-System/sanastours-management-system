import React from 'react';

export default function CustomerSidebar({ currentView, setCurrentView }) {
  const navItems = [
    { id: '/', label: 'Dashboard' },
    { id: '/tour-packages', label: 'Tour Packages' },
    { id: '/my-inquiries', label: 'My Inquiries' },
    // "My Itineraries" was removed: an itinerary belongs to a booking or a
    // package, so it is read from My Bookings and Tour Packages instead of
    // from a list of every itinerary in the system.
    { id: '/my-quotations', label: 'My Quotations' },
    { id: '/my-bookings', label: 'My Bookings' },
    { id: '/my-payments', label: 'My Payments' },
    { id: '/my-feedback', label: 'My Feedback' },
    { id: '/my-profile', label: 'My Profile' }
  ];

  return (
    <div className="w-64 bg-[#1a1a1a] text-white min-h-screen flex flex-col justify-between fixed">
      <div>
        <div className="p-6">
          <h1 className="text-2xl font-bold">SANAS <span className="text-[#f97316]">TOURS</span></h1>
        </div>
        <nav className="mt-4">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full text-left px-6 py-3 text-sm font-medium ${
                currentView === item.id ? 'bg-[#f97316] text-white' : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-6">
        <button onClick={() => { 
          localStorage.removeItem('user'); 
          localStorage.removeItem('token'); 
          window.location.href = '/';
        }} className="text-sm font-medium text-gray-300 hover:text-white">
          Logout
        </button>
      </div>
    </div>
  );
}
