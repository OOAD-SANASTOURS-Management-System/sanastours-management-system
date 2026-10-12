import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import StatusBadge from '../components/StatusBadge';
import { API_BASE } from '../api';
import { groupTours, isUnconfirmed, formatDate, bookingRef, useLiveData } from './tourState';

const TABS = [
  { id: 'upcoming', label: 'Upcoming Tours' },
  { id: 'ongoing', label: 'Ongoing Tours' },
  { id: 'completed', label: 'Completed Tours' },
  // Cancellations used to be filtered out silently, so a tour a driver was
  // counting on simply disappeared from every tab.
  { id: 'cancelled', label: 'Cancelled' }
];

const MyTours = () => {
  const [activeTab, setActiveTab] = useState('upcoming');
  const navigate = useNavigate();

  const { data, loading, updatedAt } = useLiveData(async () => {
    // The API already restricts a driver to their own bookings.
    const res = await fetch(`${API_BASE}/api/bookings`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    return groupTours(res.ok ? await res.json() : []);
  }, []);

  const groups = data || groupTours([]);
  const rows = groups[activeTab] || [];

  return (
    <>
      <Topbar title="My Tours" />
      <div className="p-8 flex-1 bg-white m-4 rounded shadow-sm border border-gray-100">
        <div className="flex justify-between items-end border-b border-gray-200 mb-6">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.id}
                className={`py-3 px-6 font-medium text-sm ${activeTab === tab.id ? 'border-b-2 border-orange-500 text-orange-500' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {groups[tab.id]?.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400">{groups[tab.id].length}</span>
                )}
              </button>
            ))}
          </div>
          {updatedAt && (
            <p className="text-xs text-gray-400 pb-3">
              Updated {updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-3 px-4 text-gray-600 font-semibold">Booking</th>
                <th className="py-3 px-4 text-gray-600 font-semibold">Tour Package</th>
                <th className="py-3 px-4 text-gray-600 font-semibold">Travel Dates</th>
                <th className="py-3 px-4 text-gray-600 font-semibold">Pick-up</th>
                <th className="py-3 px-4 text-gray-600 font-semibold">Customer</th>
                <th className="py-3 px-4 text-gray-600 font-semibold">Passengers</th>
                <th className="py-3 px-4 text-gray-600 font-semibold">Status</th>
                <th className="py-3 px-4 text-gray-600 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(t => (
                <tr key={t.bookingId} className="hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {bookingRef(t)}
                    {isUnconfirmed(t) && (
                      <span className="ml-2 bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-medium align-middle">
                        Not confirmed
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">{t.tourPackage?.packageName || 'Custom Tour'}</td>
                  <td className="py-3 px-4">{formatDate(t.travelStartDate)} to {formatDate(t.travelEndDate)}</td>
                  <td className="py-3 px-4">{t.initialLocation || '-'}</td>
                  <td className="py-3 px-4">{t.customer?.firstName} {t.customer?.lastName}</td>
                  <td className="py-3 px-4">{t.numberOfPeople}</td>
                  <td className="py-3 px-4"><StatusBadge fallback="Pending" status={t.bookingStatus} /></td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => navigate(`/driver/tours/${t.bookingId}`)} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">View</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-gray-500">
                    {loading ? 'Loading your tours...' : `No ${activeTab} tours.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default MyTours;
