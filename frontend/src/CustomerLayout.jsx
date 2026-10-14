import React, { useState, useEffect } from 'react';
import CustomerSidebar from './components/CustomerSidebar';
import { API_BASE } from './api';

export default function CustomerLayout({ currentView, setCurrentView, user, children }) {
  const [profileName, setProfileName] = useState('Customer');

  useEffect(() => {
    if (user && user.roleId) {
      fetch(`${API_BASE}/api/customers/${user.roleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch profile');
      })
      .then(data => {
        setProfileName(data.firstName + ' ' + data.lastName);
      })
      .catch(err => console.error(err));
    }
  }, [user]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <CustomerSidebar currentView={currentView} setCurrentView={setCurrentView} />
      <div className="ml-64 flex-1">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center h-16">
          <h2 className="text-lg font-medium text-gray-800">
            {currentView === '/' ? 'Dashboard' : 
             currentView === '/tour-packages' ? 'Tour Packages' : 
             /* Fix 8.11: .replace('-', ' ') only replaces the FIRST hyphen. */
             currentView.replace('/', '').replaceAll('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </h2>
          <div className="flex items-center text-sm text-[#f97316] font-medium">
            <span className="material-icons mr-1">account_circle</span>
            {profileName}
          </div>
        </header>
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
