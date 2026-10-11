import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const DriverDashboard = () => {
  const [driver, setDriver] = useState(null);
  const [tours, setTours] = useState({ upcoming: [], ongoing: [], completed: [] });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      try {
        const drvRes = await fetch('http://localhost:8081/api/drivers/me', { headers });
        if (drvRes.ok) {
          const d = await drvRes.json();
          setDriver(d);
        }
        const bRes = await fetch('http://localhost:8081/api/bookings', { headers });
        if (bRes.ok) {
          const allTours = await bRes.json();
          setTours({
            upcoming: allTours.filter(t => t.bookingStatus?.toLowerCase() === 'confirmed'),
            ongoing: allTours.filter(t => t.bookingStatus?.toLowerCase() === 'ongoing'),
            completed: allTours.filter(t => t.bookingStatus?.toLowerCase() === 'completed')
          });
        }
      } catch(e) { console.error(e); }
    };
    fetchData();
  }, []);

  const ongoingTour = tours.ongoing.length > 0 ? tours.ongoing[0] : null;

  return (
    <div className="flex-1 bg-gray-50 flex flex-col min-h-screen">
      <div className="bg-white px-8 py-5 border-b border-gray-200 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-orange-500 text-orange-500 flex items-center justify-center text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <span className="text-[#f97316] font-medium text-sm">{driver?.driverName || 'Driver'}</span>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-5xl">
        <div>
          <h2 className="text-xl font-bold mb-1">Welcome back, {driver?.driverName ? driver.driverName.split(' ')[0] : 'Driver'}</h2>
          <p className="text-gray-500 text-sm">Here are your tours and trip updates.</p>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
            <p className="text-gray-500 text-sm mb-1">Upcoming Tours</p>
            <p className="text-3xl font-bold text-gray-900">{tours.upcoming.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
            <p className="text-gray-500 text-sm mb-1">Ongoing Tours</p>
            <p className="text-3xl font-bold text-blue-600">{tours.ongoing.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
            <p className="text-gray-500 text-sm mb-1">Completed Tours</p>
            <p className="text-3xl font-bold text-gray-900">{tours.completed.length}</p>
          </div>
        </div>

        {ongoingTour && (
          <div>
            <h3 className="text-lg font-bold mb-4">Ongoing Tour</h3>
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-lg font-bold">{ongoingTour.tourPackage?.packageName || 'Custom Tour'}</h4>
                    <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-medium">Ongoing</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    BK-{String(ongoingTour.bookingId).padStart(3, '0')} | {new Date(ongoingTour.travelStartDate).toLocaleDateString('en-GB', {day: '2-digit', month:'short', year:'numeric'})} to {new Date(ongoingTour.travelEndDate).toLocaleDateString('en-GB', {day: '2-digit', month:'short', year:'numeric'})}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {ongoingTour.customer?.firstName} {ongoingTour.customer?.lastName}, {ongoingTour.numberOfPeople} travellers | {ongoingTour.vehicle?.model} ({ongoingTour.vehicle?.registrationNo})
                  </p>
                </div>
                <button onClick={() => navigate(`/driver/tours/${ongoingTour.bookingId}`)} className="text-[#f97316] border border-[#f97316] px-4 py-1.5 rounded text-sm font-medium hover:bg-orange-50">
                  View Tour
                </button>
              </div>

              <div className="py-8 my-4 relative">
                {/* Horizontal line */}
                <div className="absolute top-11 left-8 right-8 h-1 bg-gray-200 z-0"></div>
                
                <div className="flex justify-between relative z-10">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs border-[3px] border-white shadow-sm mb-2">✓</div>
                    <p className="text-xs font-bold text-center">Tour Started</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs border-[3px] border-white shadow-sm mb-2">✓</div>
                    <p className="text-xs font-bold text-center">Dropped at Destination</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-[#f97316] flex items-center justify-center text-[#f97316] font-bold text-xs shadow-sm mb-2">3</div>
                    <p className="text-xs font-bold text-center">Return Journey Started</p>
                    <p className="text-[10px] text-gray-400">Waiting</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center text-gray-400 font-bold text-xs shadow-sm mb-2">4</div>
                    <p className="text-xs font-bold text-center text-gray-400">Tour Ended</p>
                    <p className="text-[10px] text-gray-400">Waiting</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-6">
                <div className="bg-blue-50 border border-blue-100 rounded p-3 flex-1 mr-4">
                  <p className="text-xs text-blue-700">Next step: when you pick up the tourists for the return trip, tap the button so the admin and the customer are notified.</p>
                </div>
                <button onClick={() => navigate(`/driver/tours/${ongoingTour.bookingId}`)} className="bg-[#f97316] text-white px-6 py-3 rounded font-medium hover:bg-orange-600 shadow-sm">
                  Start Return Journey
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-bold mb-4">Upcoming Tours</h3>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Booking ID</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Tour Package</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Travel Dates</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Customer</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Travellers</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tours.upcoming.map((t, i) => (
                  <tr key={i}>
                    <td className="py-3 px-6">BK-{String(t.bookingId).padStart(3, '0')}</td>
                    <td className="py-3 px-6">{t.tourPackage?.packageName || 'Custom Tour'}</td>
                    <td className="py-3 px-6">{new Date(t.travelStartDate).toLocaleDateString('en-GB', {day: '2-digit', month:'short', year:'numeric'})}</td>
                    <td className="py-3 px-6">{t.customer?.firstName} {t.customer?.lastName}</td>
                    <td className="py-3 px-6">{t.numberOfPeople}</td>
                    <td className="py-3 px-6 text-right">
                      <button onClick={() => navigate(`/driver/tours/${t.bookingId}`)} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">View</button>
                    </td>
                  </tr>
                ))}
                {tours.upcoming.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-gray-500">No upcoming tours assigned.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
