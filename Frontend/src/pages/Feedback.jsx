import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import StarRating, { ratingText } from '../components/StarRating';
import { API_BASE } from '../api';
import { applyFilters } from '../utils/filters';
import { feedbackRef, bookingRef, formatDate, formatRange, average } from '../utils/feedback';

const customerName = (f) =>
  f.booking?.customer ? `${f.booking.customer.firstName} ${f.booking.customer.lastName}` : 'Unknown';

/** What customers say about their completed tours. Read-only for the office. */
const Feedback = ({ setCurrentView }) => {
  const [feedback, setFeedback] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/feedback`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          const data = await res.json();
          setFeedback(Array.isArray(data) ? [...data].sort((a, b) => (b.feedbackId || 0) - (a.feedbackId || 0)) : []);
        }
      } catch (e) { console.error(e); }
      setLoaded(true);
    })();
  }, []);

  if (selected) {
    const b = selected.booking;
    return (
      <div className="flex-1 bg-[#fafafa] min-h-screen">
        <Topbar title="Feedback Details" subtitle="View customer feedback and the tour it relates to." />
        <div className="p-8 max-w-3xl space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 font-bold text-sm text-gray-800">Feedback Information</div>
            <div className="p-6 grid grid-cols-[160px_1fr] gap-y-4 text-sm items-center">
              <div className="font-medium text-gray-700">Feedback ID</div><div className="font-bold">{feedbackRef(selected)}</div>
              <div className="font-medium text-gray-700">Customer</div><div>{customerName(selected)}</div>
              <div className="font-medium text-gray-700">Booking ID</div><div>{bookingRef(b?.bookingId)}</div>
              <div className="font-medium text-gray-700">Tour Package</div><div>{b?.tourPackage?.packageName || 'Custom Package'}</div>
              <div className="font-medium text-gray-700">Travel Dates</div><div>{formatRange(b?.travelStartDate, b?.travelEndDate)}</div>
              <div className="font-medium text-gray-700">Driver</div><div>{b?.driver?.driverName || 'Not assigned'}</div>
              <div className="font-medium text-gray-700">Submitted On</div><div>{formatDate(selected.createdAt)}</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-100 px-6 py-4 font-bold text-sm text-gray-800">Customer Rating</div>
            <div className="p-6 text-sm">
              <div className="flex items-center gap-3 mb-4">
                <StarRating value={selected.rating} size={22} />
                <span className="font-bold text-gray-800">{ratingText(selected.rating)}</span>
              </div>
              <p className="font-medium text-gray-700 mb-1">Comment</p>
              <p className="text-gray-700 whitespace-pre-wrap">{selected.reviewText || <span className="text-gray-400 italic">The customer did not leave a comment.</span>}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setSelected(null)} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Back</button>
            <button onClick={() => setCurrentView && setCurrentView('/bookings')} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">View Booking</button>
          </div>
        </div>
      </div>
    );
  }

  const avg = average(feedback);
  const counts = [5, 4, 3, 2, 1].map(star => ({ star, count: feedback.filter(f => f.rating === star).length }));
  const maxCount = Math.max(1, ...counts.map(c => c.count));

  const visible = applyFilters(feedback, {
    query: search,
    fields: [
      (f) => feedbackRef(f),
      (f) => bookingRef(f.booking?.bookingId),
      (f) => customerName(f),
      (f) => f.booking?.tourPackage?.packageName,
      'reviewText'
    ],
    status: ratingFilter,
    statusField: (f) => String(f.rating)
  });

  return (
    <div className="flex-1 bg-[#fafafa] min-h-screen">
      <Topbar title="Feedback" subtitle="See what customers say about their completed tours." />
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-[260px_1fr] gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 text-center">
            <p className="text-gray-500 text-sm">Average Rating</p>
            <p className="text-4xl font-bold text-gray-900 my-2">{feedback.length ? avg.toFixed(1) : '-'}</p>
            <StarRating value={Math.round(avg)} size={20} />
            <p className="text-xs text-gray-500 mt-2">Based on {feedback.length} review{feedback.length === 1 ? '' : 's'}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex flex-col justify-center gap-2">
            {counts.map(({ star, count }) => (
              <div key={star} className="flex items-center gap-3 text-xs text-gray-600">
                <span className="w-10">{star} star</span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#f97316] rounded-full" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <input type="text" placeholder="Search feedback..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-[#e5e7eb] font-semibold text-gray-700 placeholder-gray-600 border-none rounded px-4 py-2 text-sm w-64 focus:outline-none" />
          <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)}
            className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-600 focus:outline-none w-44 bg-white">
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-200 border-b border-gray-300 text-gray-700">
                {['Feedback ID', 'Customer', 'Booking ID', 'Tour Package', 'Rating', 'Comment', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {visible.length > 0 ? visible.map(f => (
                <tr key={f.feedbackId} className="hover:bg-gray-50">
                  <td className="px-3 py-4 whitespace-nowrap">{feedbackRef(f)}</td>
                  <td className="px-3 py-4 whitespace-nowrap">{customerName(f)}</td>
                  <td className="px-3 py-4 whitespace-nowrap">{bookingRef(f.booking?.bookingId)}</td>
                  <td className="px-3 py-4">{f.booking?.tourPackage?.packageName || 'Custom Package'}</td>
                  <td className="px-3 py-4"><StarRating value={f.rating} /></td>
                  <td className="px-3 py-4 text-gray-600 max-w-xs"><p className="line-clamp-2">{f.reviewText || '-'}</p></td>
                  <td className="px-3 py-4 whitespace-nowrap">{formatDate(f.createdAt)}</td>
                  <td className="px-3 py-4">
                    <button onClick={() => setSelected(f)} className="text-[#f97316] font-medium border border-[#f97316] px-2 py-1 rounded hover:bg-orange-50">View</button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" className="px-3 py-8 text-center text-gray-500">{loaded ? 'No feedback found.' : 'Loading...'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Feedback;
