import React from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../api';
import {
  TOUR_STEPS, groupTours, isUnconfirmed, nextStepFor,
  formatDate, bookingRef, useLiveData
} from './tourState';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const DriverDashboard = () => {
  const navigate = useNavigate();

  /**
   * One loader for the whole screen, refreshed on a timer and whenever the
   * driver comes back to the tab, so an assignment or cancellation made by
   * the office turns up without them reloading the page.
   */
  const { data, loading, updatedAt } = useLiveData(async () => {
    const headers = authHeaders();
    const [drvRes, bRes] = await Promise.all([
      fetch(`${API_BASE}/api/drivers/me`, { headers }),
      fetch(`${API_BASE}/api/bookings`, { headers })
    ]);

    const driver = drvRes.ok ? await drvRes.json() : null;
    const bookings = bRes.ok ? await bRes.json() : [];
    const groups = groupTours(bookings);

    // Progress for every running tour, not just the first: a driver can be
    // part-way through one trip while another has already started.
    const updatesByBooking = {};
    await Promise.all(groups.ongoing.map(async (tour) => {
      const res = await fetch(`${API_BASE}/api/trip-updates/booking/${tour.bookingId}`, { headers });
      updatesByBooking[tour.bookingId] = res.ok ? await res.json() : [];
    }));

    return { driver, groups, updatesByBooking };
  }, []);

  if (loading && !data) {
    return (
      <div className="flex-1 bg-gray-50 min-h-screen p-8">
        <p className="text-gray-500 text-sm">Loading your tours...</p>
      </div>
    );
  }

  const { driver, groups, updatesByBooking } = data || { groups: groupTours([]), updatesByBooking: {} };

  return (
    <div className="flex-1 bg-gray-50 flex flex-col min-h-screen">
      <div className="bg-white px-8 py-5 border-b border-gray-200 flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          {updatedAt && (
            <p className="text-xs text-gray-400 mt-0.5">
              Updated {updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}, refreshes automatically
            </p>
          )}
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

        {/* A cancellation is the one change a driver must not miss, so it
            leads rather than sitting in a tab they may not open. */}
        {groups.cancelled.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-bold text-sm text-red-800 mb-1">
              {groups.cancelled.length} tour{groups.cancelled.length === 1 ? '' : 's'} cancelled
            </p>
            <p className="text-sm text-red-700">
              {groups.cancelled.slice(0, 3).map(t => `${bookingRef(t)} (${formatDate(t.travelStartDate)})`).join(', ')}
              {groups.cancelled.length > 3 ? ', and others' : ''}. Do not travel for these.
            </p>
          </div>
        )}

        <div className={`grid gap-6 ${groups.cancelled.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
            <p className="text-gray-500 text-sm mb-1">Upcoming Tours</p>
            <p className="text-3xl font-bold text-gray-900">{groups.upcoming.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
            <p className="text-gray-500 text-sm mb-1">Ongoing Tours</p>
            <p className="text-3xl font-bold text-blue-600">{groups.ongoing.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
            <p className="text-gray-500 text-sm mb-1">Completed Tours</p>
            <p className="text-3xl font-bold text-gray-900">{groups.completed.length}</p>
          </div>
          {groups.cancelled.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-red-200 text-center shadow-sm">
              <p className="text-gray-500 text-sm mb-1">Cancelled</p>
              <p className="text-3xl font-bold text-red-600">{groups.cancelled.length}</p>
            </div>
          )}
        </div>

        {groups.ongoing.map((tour) => {
          const updates = updatesByBooking[tour.bookingId] || [];
          const nextStep = nextStepFor(updates);
          return (
            <div key={tour.bookingId}>
              <h3 className="text-lg font-bold mb-4">Ongoing Tour</h3>
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-bold">{tour.tourPackage?.packageName || 'Custom Tour'}</h4>
                      <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded font-medium">Ongoing</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {bookingRef(tour)} | {formatDate(tour.travelStartDate)} to {formatDate(tour.travelEndDate)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {tour.customer?.firstName} {tour.customer?.lastName}
                      {tour.customer?.phone ? `, ${tour.customer.phone}` : ''}
                      {' '}| {tour.numberOfPeople} travellers
                      {tour.vehicle ? ` | ${tour.vehicle.model} (${tour.vehicle.registrationNo})` : ''}
                    </p>
                  </div>
                  <button onClick={() => navigate(`/driver/tours/${tour.bookingId}`)} className="text-[#f97316] border border-[#f97316] px-4 py-1.5 rounded text-sm font-medium hover:bg-orange-50 shrink-0">
                    View Tour
                  </button>
                </div>

                {/* Where the driver has to be, which the dashboard never showed. */}
                {(tour.initialLocation || tour.returnDropOffLocation) && (
                  <div className="grid grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Pick-up</p>
                      <p className="font-medium">{tour.initialLocation || 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Drop-off</p>
                      <p className="font-medium">{tour.returnDropOffLocation || 'Not set'}</p>
                    </div>
                  </div>
                )}

                <div className="py-8 my-4 relative">
                  <div className="absolute top-11 left-8 right-8 h-1 bg-gray-200 z-0"></div>
                  <div className="flex justify-between relative z-10">
                    {TOUR_STEPS.map((step, i) => {
                      const done = updates.some(u => u.stepName === step);
                      const isNext = step === nextStep;
                      return (
                        <div key={step} className="flex flex-col items-center w-1/4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-[3px] border-white shadow-sm mb-2 ${
                            done
                              ? 'bg-green-600 text-white'
                              : isNext
                                ? 'bg-white border-2 border-[#f97316] text-[#f97316]'
                                : 'bg-white border-2 border-gray-300 text-gray-400'
                          }`}>{done ? '✓' : i + 1}</div>
                          <p className={`text-xs font-bold text-center ${done || isNext ? '' : 'text-gray-400'}`}>{step}</p>
                          {!done && <p className="text-[10px] text-gray-400">{isNext ? 'Next' : 'Waiting'}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-6">
                  <div className="bg-blue-50 border border-blue-100 rounded p-3 flex-1 mr-4">
                    <p className="text-xs text-blue-700">
                      {nextStep
                        ? `Next step: record "${nextStep}" so the office and the customer are notified.`
                        : 'All steps recorded for this tour.'}
                    </p>
                  </div>
                  <button onClick={() => navigate(`/driver/tours/${tour.bookingId}`)} className="bg-[#f97316] text-white px-6 py-3 rounded font-medium hover:bg-orange-600 shadow-sm shrink-0">
                    {nextStep ? `Record "${nextStep}"` : 'View Tour'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <div>
          <h3 className="text-lg font-bold mb-4">Upcoming Tours</h3>
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Booking ID</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Tour Package</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Travel Dates</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Pick-up</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Customer</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold">Travellers</th>
                  <th className="py-3 px-6 text-gray-600 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.upcoming.map((t) => (
                  <tr key={t.bookingId}>
                    <td className="py-3 px-6">
                      {bookingRef(t)}
                      {/* The office has assigned this but not confirmed it, so
                          the details may still move. */}
                      {isUnconfirmed(t) && (
                        <span className="ml-2 bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-medium align-middle">
                          Not confirmed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-6">{t.tourPackage?.packageName || 'Custom Tour'}</td>
                    <td className="py-3 px-6">{formatDate(t.travelStartDate)} to {formatDate(t.travelEndDate)}</td>
                    <td className="py-3 px-6">{t.initialLocation || '-'}</td>
                    <td className="py-3 px-6">{t.customer?.firstName} {t.customer?.lastName}</td>
                    <td className="py-3 px-6">{t.numberOfPeople}</td>
                    <td className="py-3 px-6 text-right">
                      <button onClick={() => navigate(`/driver/tours/${t.bookingId}`)} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">View</button>
                    </td>
                  </tr>
                ))}
                {groups.upcoming.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-6 text-center text-gray-500">No upcoming tours assigned.</td>
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
