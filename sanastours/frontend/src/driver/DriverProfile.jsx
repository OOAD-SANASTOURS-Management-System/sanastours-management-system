import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';

const DriverProfile = () => {
  const [driver, setDriver] = useState(null);
  
  // To find the currently assigned vehicle, we would theoretically look at their ongoing bookings,
  // but for simplicity or if they have a primary vehicle assigned, we'll fetch it.
  // The backend might not have a direct vehicle link on the driver, but we can look for an ongoing booking.
  const [assignedVehicle, setAssignedVehicle] = useState(null);
  const [vehicleContext, setVehicleContext] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      try {
        const drvRes = await fetch(`${API_BASE}/api/drivers/me`, { headers });
        if (drvRes.ok) {
          const d = await drvRes.json();
          setDriver(d);
        }

        const bRes = await fetch(`${API_BASE}/api/bookings`, { headers });
        if (bRes.ok) {
          const allTours = await bRes.json();
          // Fix 5.14: this took the first booking in list order that was
          // Ongoing *or* Confirmed, so a driver with several tours was shown
          // the vehicle from an arbitrary future one. Prefer the tour actually
          // running; otherwise the next one by start date.
          const withVehicle = allTours.filter(t => t.vehicle);
          const byStart = (a, b) => new Date(a.travelStartDate) - new Date(b.travelStartDate);
          const current = withVehicle.filter(t => t.bookingStatus === 'Ongoing').sort(byStart);
          const next = withVehicle.filter(t => t.bookingStatus === 'Confirmed').sort(byStart);
          const chosen = current[0] || next[0];
          if (chosen) {
            setAssignedVehicle(chosen.vehicle);
            setVehicleContext(chosen.bookingStatus === 'Ongoing' ? 'current tour' : 'next tour');
          }
        }
      } catch(e) { console.error(e); }
    };
    fetchData();
  }, []);

  const getInitials = (name) => {
    if (!name) return 'D';
    const parts = name.split(' ');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col min-h-screen">
      <div className="bg-white px-8 py-5 border-b border-gray-200 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-[#f97316] text-[#f97316] flex items-center justify-center text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <span className="text-[#f97316] font-medium text-sm">{driver?.driverName ? driver.driverName.split(' ')[0] : 'Driver'}</span>
        </div>
      </div>

      <div className="p-8 max-w-5xl">
        <p className="text-gray-500 font-medium text-sm mb-6">Your driver details and assigned vehicle. Contact the admin to change any of these.</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="flex items-center gap-6 mb-6">
              <div className="w-20 h-20 rounded-full bg-[#f97316] flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {getInitials(driver?.driverName)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{driver?.driverName || 'Driver Name'}</h2>
                <p className="text-sm text-gray-400 mt-1">Driver ID: DRV-{String(driver?.driverId || '0').padStart(3, '0')}</p>
              </div>
            </div>

            <hr className="border-gray-100 mb-6" />

            <div className="space-y-6 max-w-md">
              <div className="grid grid-cols-2">
                <span className="text-sm font-bold text-gray-800">Licence Number</span>
                <span className="text-sm text-gray-800">{driver?.licenseNumber || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-sm font-bold text-gray-800">Phone Number</span>
                <span className="text-sm text-gray-800">{driver?.phone || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-sm font-bold text-gray-800">Experience</span>
                <span className="text-sm text-gray-800">{driver?.experienceYears ? `${driver.experienceYears} Years` : 'N/A'}</span>
              </div>
              <div className="grid grid-cols-2 items-center">
                <span className="text-sm font-bold text-gray-800">Availability</span>
                <div>
                  <span className={`px-3 py-1 rounded text-xs font-semibold text-white ${driver?.driverStatus === 'Available' ? 'bg-green-600' : 'bg-[#f97316]'}`}>
                    {driver?.driverStatus || 'Assigned'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 mb-4">
                Assigned Vehicle{vehicleContext ? ` (${vehicleContext})` : ''}
              </h3>
              {assignedVehicle ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-800">{assignedVehicle.model || 'Unknown Model'} {assignedVehicle.vehicleType || ''}</p>
                  <p className="text-sm text-gray-800">Registration: {assignedVehicle.registrationNo || 'N/A'}</p>
                  <p className="text-sm text-gray-800">Seats: {assignedVehicle.capacity || 'N/A'}</p>
                  <p className="text-sm text-gray-800">Vehicle ID: VEH-{String(assignedVehicle.vehicleId || '0').padStart(3, '0')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-800">No active vehicle assigned.</p>
                  <p className="text-xs text-gray-400">You will be assigned a vehicle when a tour begins.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverProfile;
