import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import { awaitingFeedback } from '../../utils/feedback';

export default function CustomerDashboard({ setCurrentView, onGiveFeedback }) {
  const [user] = useState(() => JSON.parse(localStorage.getItem('user')));
  const [stats, setStats] = useState({ inquiries: 0, quotations: 0, bookings: 0, payments: 0, feedback: 0, awaitingFeedback: 0 });
  const [upcomingTrip, setUpcomingTrip] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [attentionItems, setAttentionItems] = useState([]);
  const [recentInquiries, setRecentInquiries] = useState([]);
  const [profileFirstName, setProfileFirstName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
      // Read the signed-in customer's id from storage inside the effect, so the
      // effect does not depend on render state that never changes.
      let roleId = null;
      try {
        roleId = JSON.parse(localStorage.getItem('user') || 'null')?.roleId || null;
      } catch {
        roleId = null;
      }
      try {
        const [inqRes, quotRes, bookRes, payRes, fbRes, profileRes] = await Promise.all([
          fetch(`${API_BASE}/api/inquiries`, { headers }),
          fetch(`${API_BASE}/api/quotations`, { headers }),
          fetch(`${API_BASE}/api/bookings`, { headers }),
          fetch(`${API_BASE}/api/payments`, { headers }),
          fetch(`${API_BASE}/api/feedback`, { headers }),
          roleId
            ? fetch(`${API_BASE}/api/customers/${roleId}`, { headers })
            : Promise.resolve(null)
        ]);

        if (profileRes && profileRes.ok) {
          const profile = await profileRes.json();
          if (profile?.firstName) setProfileFirstName(profile.firstName);
        }
        
        const inquiries = await inqRes.json();
        const quotations = await quotRes.json();
        const bookings = await bookRes.json();
        const payments = await payRes.json();
        const feedback = fbRes.ok ? await fbRes.json() : [];
        const toRate = awaitingFeedback(Array.isArray(bookings) ? bookings : [], Array.isArray(feedback) ? feedback : []);

        setStats({
          inquiries: Array.isArray(inquiries) ? inquiries.length : 0,
          quotations: Array.isArray(quotations) ? quotations.length : 0,
          bookings: Array.isArray(bookings) ? bookings.length : 0,
          payments: Array.isArray(payments) ? payments.length : 0,
          feedback: Array.isArray(feedback) ? feedback.length : 0,
          awaitingFeedback: toRate.length
        });

        if (Array.isArray(bookings)) {
          // Fix 8.4: this sorted confirmed bookings by start date and took the
          // first, with no comparison against today, so a tour that finished
          // last year was presented as the upcoming trip. An ongoing tour wins;
          // otherwise take the soonest one that has not started yet.
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const byStartDate = (a, b) => new Date(a.travelStartDate) - new Date(b.travelStartDate);

          const ongoing = bookings
            .filter(b => b.bookingStatus?.toLowerCase() === 'ongoing')
            .sort(byStartDate);
          const future = bookings
            .filter(b => b.bookingStatus?.toLowerCase() === 'confirmed'
              && b.travelStartDate && new Date(b.travelStartDate) >= today)
            .sort(byStartDate);

          setUpcomingTrip(ongoing[0] || future[0] || null);

          // Fix 8.3: slice(0, 3) of an unsorted list gave the oldest three.
          const newest = [...bookings].sort((a, b) => (b.bookingId || 0) - (a.bookingId || 0));
          setRecentBookings(newest.slice(0, 3).map(b => ({
            id: `BK-${String(b.bookingId).padStart(3, '0')}`,
            tour: b.tourPackage ? b.tourPackage.packageName : 'Custom Tour',
            date: b.travelStartDate ? new Date(b.travelStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown',
            status: b.bookingStatus || 'Pending'
          })));
        }

        if (Array.isArray(inquiries)) {
          const newestInquiries = [...inquiries].sort((a, b) => (b.inquiryId || 0) - (a.inquiryId || 0));
          setRecentInquiries(newestInquiries.slice(0, 3).map(inq => ({
            id: `INQ-${String(inq.inquiryId).padStart(3, '0')}`,
            destination: inq.destinationArea || 'Not specified',
            status: inq.inquiryStatus || 'New'
          })));
        }

        const attention = [];
        // A finished tour waiting for a rating goes first. Only the most
        // recent one is shown, so a long history cannot crowd out the rest.
        const latestToRate = [...toRate].sort((a, b) => (b.bookingId || 0) - (a.bookingId || 0))[0];
        if (latestToRate) {
          const ref = `BK-${String(latestToRate.bookingId).padStart(3, '0')}`;
          attention.push({
            type: 'feedback',
            isNew: true,
            title: `How was your ${latestToRate.tourPackage?.packageName || 'recent'} tour?`,
            subtitle: `${ref} is completed. Rate your trip in under a minute.`,
            action: 'Give Feedback',
            path: '/my-feedback',
            bookingId: latestToRate.bookingId
          });
        }
        if (Array.isArray(quotations)) {
          // Fix 8.5: this looked for 'pending' or 'quoted', neither of which is
          // a quotation status in this system (they are Draft, Sent to
          // Customer, Accepted, Rejected and Expired), so a quotation waiting
          // for a response never appeared here.
          quotations.filter(q => ['sent to customer', 'sent'].includes((q.quotationStatus || '').toLowerCase())).forEach(q => {
            attention.push({
              type: 'quotation',
              id: `QT-${String(q.quotationId).padStart(3, '0')}`,
              title: `QT-${String(q.quotationId).padStart(3, '0')} is waiting for your response`,
              subtitle: `USD ${q.totalAmount}${q.validUntil ? `, valid until ${new Date(q.validUntil).toLocaleDateString('en-GB')}` : ''}`,
              action: 'Review Quotation',
              path: '/my-quotations'
            });
          });
        }
        if (Array.isArray(payments)) {
          payments.filter(p => p.paymentStatus?.toLowerCase() === 'pending').forEach(p => {
            attention.push({
              type: 'payment',
              id: `PAY-${String(p.paymentId).padStart(3, '0')}`,
              title: `Pending payment of USD ${p.amount}`,
              subtitle: `For Booking BK-${String(p.booking?.bookingId).padStart(3, '0')}`,
              action: 'Make Payment',
              path: '/my-payments'
            });
          });
        }
        setAttentionItems(attention.slice(0, 3));

      } catch (e) {
        console.error("Dashboard fetch error:", e);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Fix 8.6: this derived a name from `username.split('_')[0]`, but a
  // self-registered customer's username is their email address, so the page
  // greeted them as "sarah@email.com". Use the profile name, and fall back to
  // the part of the username before any @ or _.
  const firstName = profileFirstName
    || (user?.username
      ? (() => {
          const base = user.username.split('@')[0].split('_')[0];
          return base.charAt(0).toUpperCase() + base.slice(1);
        })()
      : 'Customer');

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back, {firstName}</h1>
        <p className="text-gray-500 text-sm">Here is an overview of your tours with SANASTOURS.</p>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
          <p className="text-gray-500 text-sm mb-2">My Inquiries</p>
          <p className="text-3xl font-bold text-gray-800">{stats.inquiries}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
          <p className="text-gray-500 text-sm mb-2">Quotations</p>
          <p className="text-3xl font-bold text-gray-800">{stats.quotations}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
          <p className="text-gray-500 text-sm mb-2">Bookings</p>
          <p className="text-3xl font-bold text-gray-800">{stats.bookings}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
          <p className="text-gray-500 text-sm mb-2">Payments</p>
          <p className="text-3xl font-bold text-gray-800">{stats.payments}</p>
        </div>
        <button onClick={() => setCurrentView('/my-feedback')} className={`bg-white p-6 rounded-lg border text-center shadow-sm hover:bg-gray-50 ${stats.awaitingFeedback > 0 ? 'border-[#f97316]' : 'border-gray-200'}`}>
          <p className="text-gray-500 text-sm mb-2">
            My Feedback
            {stats.awaitingFeedback > 0 && <span className="ml-2 text-[10px] font-semibold text-[#f97316] bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 align-middle">New</span>}
          </p>
          <p className="text-3xl font-bold text-gray-800">{stats.feedback}</p>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Upcoming Trip</h3>
            {upcomingTrip ? (
              <div className="bg-white p-6 rounded-lg border-l-4 border-[#f97316] shadow-sm flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-lg text-gray-900">{upcomingTrip.tourPackage?.packageName || 'Custom Tour'}</h4>
                  <p className="text-sm text-gray-500 mt-1">BK-{String(upcomingTrip.bookingId).padStart(3, '0')} | {formatDate(upcomingTrip.travelStartDate)} to {formatDate(upcomingTrip.travelEndDate)}</p>
                  <p className="text-sm text-gray-500">{upcomingTrip.numberOfPeople} travellers</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Driver: {upcomingTrip.driver ? upcomingTrip.driver.driverName : 'Pending'} | 
                    Vehicle: {upcomingTrip.vehicle ? `${upcomingTrip.vehicle.model} (${upcomingTrip.vehicle.registrationNo})` : 'Pending'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[#f97316] font-medium text-sm mb-2">Status: {upcomingTrip.bookingStatus}</p>
                  <button onClick={() => setCurrentView('/my-bookings')} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">View Booking</button>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm text-center">
                <p className="text-gray-500">You don't have any upcoming trips.</p>
                <button onClick={() => setCurrentView('/tour-packages')} className="mt-4 text-[#f97316] font-medium hover:underline">Explore Tour Packages</button>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Bookings</h3>
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 font-medium text-gray-700">Booking ID</th>
                    <th className="p-4 font-medium text-gray-700">Tour</th>
                    <th className="p-4 font-medium text-gray-700">Date</th>
                    <th className="p-4 font-medium text-gray-700">Status</th>
                    <th className="p-4 font-medium text-gray-700 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentBookings.length > 0 ? recentBookings.map((b, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-4 text-gray-800 font-medium">{b.id}</td>
                      <td className="p-4 text-gray-600 truncate max-w-[150px]">{b.tour}</td>
                      <td className="p-4 text-gray-600">{b.date}</td>
                      <td className="p-4"><StatusBadge status={b.status} /></td>
                      <td className="p-4 text-right"><button onClick={() => setCurrentView('/my-bookings')} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs hover:bg-orange-50 font-medium">View</button></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="p-4 text-center text-gray-500">No bookings found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="col-span-1 space-y-8">
          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Needs Your Attention</h3>
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm space-y-4">
              {attentionItems.length > 0 ? attentionItems.map((item, i) => (
                <div key={i} className={`${i !== attentionItems.length - 1 ? 'border-b border-gray-100 pb-4' : ''}`}>
                  <p className="font-bold text-sm text-gray-800">
                    {item.title}
                    {item.isNew && <span className="ml-2 text-[10px] font-semibold text-[#f97316] bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 align-middle">New</span>}
                  </p>
                  <p className="text-xs text-gray-500 mb-2 mt-1">{item.subtitle}</p>
                  <button onClick={() => (item.bookingId && onGiveFeedback ? onGiveFeedback(item.bookingId) : setCurrentView(item.path))} className="bg-[#f97316] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-orange-600">{item.action}</button>
                </div>
              )) : (
                <p className="text-sm text-gray-500 italic">You're all caught up!</p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Inquiries</h3>
            <div className="space-y-3">
              {recentInquiries.length > 0 ? recentInquiries.map((inq, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center hover:bg-gray-50 cursor-pointer" onClick={() => setCurrentView('/my-inquiries')}>
                  <div>
                    <p className="font-bold text-sm text-gray-800">{inq.id}</p>
                    <p className="text-xs text-gray-500">{inq.destination}</p>
                  </div>
                  <StatusBadge status={inq.status} />
                </div>
              )) : (
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm text-center">
                  <p className="text-sm text-gray-500">No inquiries yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
