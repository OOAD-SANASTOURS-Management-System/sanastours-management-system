import React, { useState } from 'react';
import Topbar from '../components/Topbar';
import { API_BASE } from '../api';
import StatusBadge from '../components/StatusBadge';
import TripProgress from '../components/TripProgress';
import StarRating from '../components/StarRating';
import { bookingRef, average } from '../utils/feedback';
import { useLiveData } from '../utils/useLiveData';

const Dashboard = ({ setCurrentView }) => {
  const [stats, setStats] = useState({ customers: 0, inquiries: 0, bookings: 0, paymentsReceived: 0, ongoingTours: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [recentInquiries, setRecentInquiries] = useState([]);
  const [driverUpdates, setDriverUpdates] = useState([]);
  // The tours currently on the road, and the steps recorded against each.
  const [ongoingTours, setOngoingTours] = useState([]);
  const [tripUpdates, setTripUpdates] = useState({});
  const [feedbackSummary, setFeedbackSummary] = useState({ count: 0, average: 0, latest: [] });

  // Refetched on a timer and whenever the tab is brought back into view: the
  // office is watching this to see a driver's progress arrive, so a screen
  // that only loads once defeats the point.
  const { updatedAt } = useLiveData(async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      try {
        const [custRes, inqRes, bookRes, payRes, updateRes, fbRes] = await Promise.all([
          fetch(`${API_BASE}/api/customers`, { headers }),
          fetch(`${API_BASE}/api/inquiries`, { headers }),
          fetch(`${API_BASE}/api/bookings`, { headers }),
          fetch(`${API_BASE}/api/payments`, { headers }),
          fetch(`${API_BASE}/api/trip-updates/recent`, { headers }),
          fetch(`${API_BASE}/api/feedback`, { headers })
        ]);
        
        const customers = await custRes.json();
        const inquiries = await inqRes.json();
        const bookings = await bookRes.json();
        const payments = await payRes.json();
        
        let updates = [];
        if (updateRes.ok) {
          updates = await updateRes.json();
        }

        if (fbRes.ok) {
          const fb = await fbRes.json();
          if (Array.isArray(fb)) {
            setFeedbackSummary({
              count: fb.length,
              average: average(fb),
              latest: [...fb].sort((a, b) => (b.feedbackId || 0) - (a.feedbackId || 0)).slice(0, 3)
            });
          }
        }

        const onTheRoad = Array.isArray(bookings)
          ? bookings.filter(b => (b.bookingStatus || '').toLowerCase() === 'ongoing')
          : [];
        setOngoingTours(onTheRoad);

        // One request per running tour. There are rarely more than a handful,
        // and they run in parallel, so this stays cheaper than adding an
        // endpoint for it.
        const byBooking = {};
        await Promise.all(onTheRoad.map(async (tour) => {
          const res = await fetch(`${API_BASE}/api/trip-updates/booking/${tour.bookingId}`, { headers });
          byBooking[tour.bookingId] = res.ok ? await res.json() : [];
        }));
        setTripUpdates(byBooking);

        // Fix 8.13: the "Payments" tile counted payment records under a label
        // that reads as an amount. Show the money actually received instead.
        const paymentsReceived = Array.isArray(payments)
          ? payments
              .filter(p => (p.paymentStatus || '').toLowerCase() === 'paid')
              .reduce((sum, p) => sum + (p.amount || 0), 0)
          : 0;

        setStats({
          customers: Array.isArray(customers) ? customers.length : 0,
          inquiries: Array.isArray(inquiries) ? inquiries.length : 0,
          bookings: Array.isArray(bookings) ? bookings.length : 0,
          paymentsReceived,
          ongoingTours: onTheRoad.length
        });

        if (Array.isArray(bookings)) {
          // Fix 8.3: slice(0, 3) on an unsorted list gave the three OLDEST
          // records. Sort by id descending so these really are the newest.
          const newestBookings = [...bookings].sort((a, b) => (b.bookingId || 0) - (a.bookingId || 0));
          setRecentBookings(newestBookings.slice(0, 3).map(b => ({
            id: `BK-${String(b.bookingId).padStart(3, '0')}`,
            customer: b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : 'Unknown',
            tour: b.tourPackage ? b.tourPackage.packageName : 'Custom Tour',
            date: b.travelStartDate ? new Date(b.travelStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown',
            status: b.bookingStatus || 'Pending'
          })));
        }

        if (Array.isArray(inquiries)) {
          const newestInquiries = [...inquiries].sort((a, b) => (b.inquiryId || 0) - (a.inquiryId || 0));
          setRecentInquiries(newestInquiries.slice(0, 3).map(inq => ({
            id: `INQ${String(inq.inquiryId).padStart(3, '0')}`,
            name: inq.customer ? `${inq.customer.firstName} ${inq.customer.lastName}` : 'Unknown',
            country: inq.customer ? inq.customer.country : 'Unknown',
            status: inq.inquiryStatus || 'New'
          })));
        }

        if (Array.isArray(updates)) {
          setDriverUpdates(updates.slice(0, 4).map(u => ({
            driverName: u.booking?.driver?.driverName || 'Unknown Driver',
            bookingId: `BK-${String(u.booking?.bookingId).padStart(3, '0')}`,
            action: u.stepName,
            time: new Date(u.updateTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + ', ' + new Date(u.updateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            isRecent: (Date.now() - new Date(u.updateTime).getTime()) < 24 * 60 * 60 * 1000
          })));
        }

      } catch (e) {
        console.error("Dashboard fetch error:", e);
      }
      return true;
  }, []);

  return (
    <div className="flex-1 bg-[#fafafa] flex flex-col min-h-screen">
      <Topbar title="Dashboard" />
      <div className="p-8 space-y-8 max-w-[1200px] w-full">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Welcome back, Admin</h2>
          <p className="text-gray-500 font-medium mt-1">
            Here is an overview of SANASTOURS operations.
            {updatedAt && (
              <span className="text-gray-400 font-normal">
                {' '}Updated {updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}, refreshes automatically.
              </span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-6 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-100 text-center shadow-sm">
            <p className="text-gray-400 text-xs font-semibold">Customers</p>
            <p className="text-3xl font-bold mt-2 text-gray-800">{stats.customers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-100 text-center shadow-sm">
            <p className="text-gray-400 text-xs font-semibold">Inquiries</p>
            <p className="text-3xl font-bold mt-2 text-gray-800">{stats.inquiries}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-100 text-center shadow-sm">
            <p className="text-gray-400 text-xs font-semibold">Bookings</p>
            <p className="text-3xl font-bold mt-2 text-gray-800">{stats.bookings}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-gray-100 text-center shadow-sm">
            <p className="text-gray-400 text-xs font-semibold">Payments Received</p>
            <p className="text-3xl font-bold mt-2 text-gray-800">USD {stats.paymentsReceived.toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-lg border border-blue-200 text-center shadow-sm">
            <p className="text-gray-400 text-xs font-semibold">Ongoing Tours</p>
            <p className="text-3xl font-bold text-[#1d4ed8] mt-2">{stats.ongoingTours}</p>
          </div>
          <button onClick={() => setCurrentView('/feedback')} className="bg-white p-6 rounded-lg border border-[#f97316] text-center shadow-sm hover:bg-orange-50">
            <p className="text-gray-400 text-xs font-semibold">Avg. Rating</p>
            <p className="text-3xl font-bold mt-2 text-gray-800">{feedbackSummary.count ? feedbackSummary.average.toFixed(1) : '-'}</p>
          </button>
        </div>

        {/* Where each tour on the road has got to, as the driver has recorded
            it. The Driver Updates feed below lists the latest events across
            all tours; this answers the different question of how far along a
            particular tour is. */}
        {ongoingTours.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-4 text-gray-800">Tours in Progress</h3>
            <div className="space-y-4">
              {ongoingTours.map(tour => (
                <div key={tour.bookingId} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex justify-between items-start mb-5 gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h4 className="font-bold text-gray-800">{tour.tourPackage?.packageName || 'Custom Tour'}</h4>
                        <StatusBadge status={tour.bookingStatus} />
                      </div>
                      <p className="text-sm text-gray-500">
                        BK-{String(tour.bookingId).padStart(3, '0')}
                        {' | '}{tour.customer ? `${tour.customer.firstName} ${tour.customer.lastName}` : 'Unknown customer'}
                        {' | '}{tour.numberOfPeople} travellers
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        Driver: {tour.driver?.driverName || 'Unassigned'}
                        {tour.vehicle ? ` | ${tour.vehicle.model} (${tour.vehicle.registrationNo})` : ''}
                        {tour.driver?.phone ? ` | ${tour.driver.phone}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentView && setCurrentView('/bookings')}
                      className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50 shrink-0"
                    >
                      Go to Bookings
                    </button>
                  </div>

                  <TripProgress updates={tripUpdates[tour.bookingId] || []} showDetail />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-lg font-bold mb-4 text-gray-800">Recent Bookings</h3>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100">
                    <tr className="text-gray-600">
                      <th className="py-3 px-4 font-semibold text-xs">Booking ID</th>
                      <th className="py-3 px-4 font-semibold text-xs">Customer</th>
                      <th className="py-3 px-4 font-semibold text-xs">Tour</th>
                      <th className="py-3 px-4 font-semibold text-xs">Date</th>
                      <th className="py-3 px-4 font-semibold text-xs">Status</th>
                      <th className="py-3 px-4 font-semibold text-xs text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentBookings.map((b, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="py-4 px-4 text-gray-700 font-medium">{b.id}</td>
                        <td className="py-4 px-4 text-gray-700">{b.customer}</td>
                        <td className="py-4 px-4 text-gray-600 truncate max-w-[150px]">{b.tour}</td>
                        <td className="py-4 px-4 text-gray-600">{b.date}</td>
                        <td className="py-4 px-4"><StatusBadge status={b.status} /></td>
                        <td className="py-4 px-4 text-right">
                          <button onClick={() => setCurrentView('/bookings')} className="text-[#f97316] border border-[#f97316] px-4 py-1 rounded-full text-xs font-semibold hover:bg-orange-50">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4 text-gray-800">Recent Inquiries</h3>
              <div className="grid grid-cols-3 gap-4">
                {recentInquiries.map((inq, i) => (
                  <div key={i} className="bg-white border border-gray-100 rounded-lg p-5 flex flex-col items-center text-center shadow-sm">
                    <p className="font-bold text-sm mb-1 text-gray-900">{inq.id}</p>
                    <p className="font-semibold text-gray-800 text-[13px]">{inq.name}</p>
                    <p className="text-gray-500 text-[11px] mb-3">{inq.country}</p>
                    <StatusBadge status={inq.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <h3 className="text-lg font-bold mb-4 text-gray-800">Driver Updates</h3>
            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              <div className="space-y-0">
                {driverUpdates.length > 0 ? driverUpdates.map((update, index) => (
                  <div key={index} className={`flex gap-3 py-4 ${index !== driverUpdates.length - 1 ? 'border-b border-gray-100' : ''}`}>
                    {/* Fix 8.14: this highlighted "the first two" by index.
                        Highlight what actually arrived in the last 24 hours. */}
                    <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${update.isRecent ? 'bg-[#f97316]' : 'bg-gray-300'}`}></div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{update.driverName} - {update.bookingId}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{update.action}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{update.time}</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-gray-500 italic">No recent driver updates.</p>
                  </div>
                )}
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-3 pl-1">Updates appear here as soon as a driver taps a trip button.</p>

            <h3 className="text-lg font-bold mb-4 mt-8 text-gray-800">Latest Feedback</h3>
            <div className="bg-white border border-gray-100 rounded-lg p-5 shadow-sm">
              {feedbackSummary.count > 0 ? (
                <>
                  <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                    <span className="text-3xl font-bold text-gray-900">{feedbackSummary.average.toFixed(1)}</span>
                    <div>
                      <StarRating value={Math.round(feedbackSummary.average)} />
                      <p className="text-[11px] text-gray-500">from {feedbackSummary.count} review{feedbackSummary.count === 1 ? '' : 's'}</p>
                    </div>
                  </div>
                  {feedbackSummary.latest.map((f, i) => (
                    <div key={f.feedbackId} className={`py-3 ${i !== feedbackSummary.latest.length - 1 ? 'border-b border-gray-100' : ''}`}>
                      <div className="flex justify-between items-center gap-2">
                        <p className="text-sm font-semibold text-gray-800">{f.booking?.customer ? `${f.booking.customer.firstName} ${f.booking.customer.lastName}` : 'Unknown'}</p>
                        <StarRating value={f.rating} size={12} />
                      </div>
                      <p className="text-xs text-gray-500">{f.booking?.tourPackage?.packageName || 'Custom Package'} ({bookingRef(f.booking?.bookingId)})</p>
                      {f.reviewText && <p className="text-xs text-gray-700 mt-1 line-clamp-2">{f.reviewText}</p>}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-gray-500 italic text-center py-2">No feedback yet.</p>
              )}
            </div>
            <button onClick={() => setCurrentView('/feedback')} className="text-xs font-semibold text-[#f97316] mt-3 pl-1 hover:underline">View all feedback</button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
