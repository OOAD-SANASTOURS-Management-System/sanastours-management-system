import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import StarRating, { ratingText } from '../../components/StarRating';
import { feedbackRef, bookingRef, formatDate, formatRange, awaitingFeedback, MAX_COMMENT } from '../../utils/feedback';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

/**
 * A customer rates a completed tour (1 to 5 stars and an optional comment),
 * reads back what they sent, and can edit it later.
 *
 * `feedbackForBooking` is set when the customer arrives from a "Give Feedback"
 * button: it opens that booking's form, or its feedback if one already exists.
 */
export default function MyFeedback({ setCurrentView, feedbackForBooking, onFeedbackFormClosed }) {
  const [bookings, setBookings] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('list'); // list | give | details | edit
  const [booking, setBooking] = useState(null);
  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [bookRes, fbRes] = await Promise.all([
        fetch(`${API_BASE}/api/bookings`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/feedback`, { headers: authHeaders() })
      ]);
      if (bookRes.ok) setBookings(await bookRes.json());
      if (fbRes.ok) setFeedback(await fbRes.json());
    } catch (e) { console.error(e); }
    setLoaded(true);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openGive = (b) => { setBooking(b); setRating(0); setComment(''); setView('give'); };
  const openDetails = (f) => { setSelected(f); setView('details'); };
  const openEdit = (f) => { setSelected(f); setRating(f.rating || 0); setComment(f.reviewText || ''); setView('edit'); };

  // Arriving from a "Give Feedback" button elsewhere.
  useEffect(() => {
    if (!feedbackForBooking || !loaded) return;
    const existing = feedback.find(f => f.booking?.bookingId === feedbackForBooking);
    if (existing) {
      openDetails(existing);
    } else {
      const b = bookings.find(x => x.bookingId === feedbackForBooking);
      if (b) openGive(b);
    }
    if (onFeedbackFormClosed) onFeedbackFormClosed();
    // Every value read above is named here. The effect does nothing unless
    // feedbackForBooking is set, and the parent clears it as soon as the form
    // opens, so a re-run from any of these simply returns.
  }, [feedbackForBooking, loaded, bookings, feedback, onFeedbackFormClosed]);

  const backToList = () => { setView('list'); setSelected(null); setBooking(null); };

  const submit = async (e) => {
    e.preventDefault();
    if (rating < 1) { alert('Please choose a rating from 1 to 5 stars.'); return; }
    const isEdit = view === 'edit';
    setSubmitting(true);
    try {
      const res = await fetch(isEdit ? `${API_BASE}/api/feedback/${selected.feedbackId}` : `${API_BASE}/api/feedback`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          ...(isEdit ? {} : { bookingId: booking.bookingId }),
          rating,
          reviewText: comment.trim()
        })
      });
      if (!res.ok) { alert(await res.text() || 'Could not save your feedback.'); return; }
      const saved = await res.json();
      alert(isEdit ? 'Your feedback has been updated.' : 'Thank you! Your feedback has been submitted.');
      await fetchData();
      setSelected(saved);
      setView('details');
    } catch (err) { alert(err); } finally { setSubmitting(false); }
  };

  const tourOf = (b) => b?.tourPackage?.packageName || 'Custom Package';
  const bookingLine = (b) => `${bookingRef(b.bookingId)} - ${tourOf(b)} (${formatRange(b.travelStartDate, b.travelEndDate)})`;

  // ---------------------------------------------------------------- form
  if (view === 'give' || view === 'edit') {
    const isEdit = view === 'edit';
    const target = isEdit ? selected.booking : booking;
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-500 mb-6 text-sm">
          {isEdit ? 'Update your rating and comment for this tour.' : 'Tell us how your tour went. You can rate it from 1 to 5 stars.'}
        </p>
        <form onSubmit={submit} className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-2xl">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking</label>
              <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-100 text-gray-700">{bookingLine(target)}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating *</label>
              <div className="flex items-center gap-4">
                <StarRating value={rating} onChange={setRating} size={32} />
                <span className="text-sm font-semibold text-[#f97316]">{rating ? ratingText(rating) : 'Select a rating'}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Comment</label>
              <textarea rows="6" maxLength={MAX_COMMENT} value={comment} onChange={e => setComment(e.target.value)}
                placeholder="What did you enjoy? Is there anything we could do better?"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
              <p className="text-right text-xs text-gray-400 mt-1">{comment.length} / {MAX_COMMENT}</p>
            </div>
            <p className="text-xs text-gray-500">
              {isEdit ? 'You can edit your feedback at any time.' : 'You can give one feedback for each completed tour. Our team will be able to read it.'}
            </p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => (isEdit ? setView('details') : backToList())} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600 disabled:opacity-60">
                {submitting ? 'Saving...' : isEdit ? 'Update Feedback' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ------------------------------------------------------------- details
  if (view === 'details' && selected) {
    const b = selected.booking;
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-gray-500 mb-6 text-sm">View the feedback you submitted for this tour.</p>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 max-w-3xl">
          <div className="grid grid-cols-[160px_1fr] gap-y-4 text-sm items-center">
            <div className="font-medium text-gray-700">Feedback ID</div><div className="font-bold">{feedbackRef(selected)}</div>
            <div className="font-medium text-gray-700">Booking ID</div><div>{bookingRef(b?.bookingId)}</div>
            <div className="font-medium text-gray-700">Tour Package</div><div>{tourOf(b)}</div>
            <div className="font-medium text-gray-700">Travel Dates</div><div>{formatRange(b?.travelStartDate, b?.travelEndDate)}</div>
            <div className="font-medium text-gray-700">Rating</div>
            <div className="flex items-center gap-2"><StarRating value={selected.rating} size={16} /><span>{ratingText(selected.rating)}</span></div>
            <div className="font-medium text-gray-700">Submitted On</div><div>{formatDate(selected.createdAt)}</div>
          </div>
          <div className="mt-4 text-sm">
            <p className="font-medium text-gray-700 mb-1">Comment</p>
            <p className="text-gray-700 whitespace-pre-wrap">{selected.reviewText || <span className="text-gray-400 italic">No comment added.</span>}</p>
          </div>
          <div className="flex gap-3 mt-8">
            <button onClick={backToList} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Back</button>
            <button onClick={() => setCurrentView && setCurrentView('/my-bookings')} className="px-4 py-2 border border-[#f97316] text-[#f97316] rounded text-sm font-medium hover:bg-orange-50">View Booking</button>
            <button onClick={() => openEdit(selected)} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">Edit Feedback</button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- list
  const awaiting = awaitingFeedback(bookings, feedback);
  const mine = [...feedback].sort((a, b) => (b.feedbackId || 0) - (a.feedbackId || 0));

  return (
    <div className="max-w-6xl mx-auto">
      <p className="text-gray-500 mb-6 text-sm">Rate your completed tours and review the feedback you have given.</p>

      <h3 className="text-lg font-semibold mb-3 text-gray-800">Tours Awaiting Your Feedback</h3>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-8">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-700">Booking ID</th>
              <th className="p-4 font-medium text-gray-700">Tour Package</th>
              <th className="p-4 font-medium text-gray-700">Travel Dates</th>
              <th className="p-4 font-medium text-gray-700">Status</th>
              <th className="p-4 font-medium text-gray-700">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {awaiting.length > 0 ? awaiting.map(b => (
              <tr key={b.bookingId} className="hover:bg-gray-50">
                <td className="p-4">{bookingRef(b.bookingId)}</td>
                <td className="p-4">{tourOf(b)}</td>
                <td className="p-4">{formatRange(b.travelStartDate, b.travelEndDate)}</td>
                <td className="p-4"><StatusBadge status={b.bookingStatus} /></td>
                <td className="p-4"><button onClick={() => openGive(b)} className="bg-[#f97316] text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-600">Give Feedback</button></td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="p-6 text-center text-gray-500">{loaded ? 'No completed tours are waiting for your feedback.' : 'Loading...'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold mb-3 text-gray-800">My Feedback</h3>
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-700">Feedback ID</th>
              <th className="p-4 font-medium text-gray-700">Booking ID</th>
              <th className="p-4 font-medium text-gray-700">Tour Package</th>
              <th className="p-4 font-medium text-gray-700">Rating</th>
              <th className="p-4 font-medium text-gray-700">Comment</th>
              <th className="p-4 font-medium text-gray-700">Date</th>
              <th className="p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {mine.length > 0 ? mine.map(f => (
              <tr key={f.feedbackId} className="hover:bg-gray-50">
                <td className="p-4">{feedbackRef(f)}</td>
                <td className="p-4">{bookingRef(f.booking?.bookingId)}</td>
                <td className="p-4">{tourOf(f.booking)}</td>
                <td className="p-4"><StarRating value={f.rating} /></td>
                <td className="p-4 text-gray-600 max-w-xs"><p className="line-clamp-2">{f.reviewText || '-'}</p></td>
                <td className="p-4 whitespace-nowrap">{formatDate(f.createdAt)}</td>
                <td className="p-4"><div className="flex gap-2">
                  <button onClick={() => openDetails(f)} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">View</button>
                  <button onClick={() => openEdit(f)} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">Edit</button>
                </div></td>
              </tr>
            )) : (
              <tr><td colSpan="7" className="p-6 text-center text-gray-500">{loaded ? "You haven't given any feedback yet." : 'Loading...'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
