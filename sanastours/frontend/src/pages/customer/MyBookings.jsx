import React, { useState, useEffect } from 'react';
import { applyFilters } from '../../utils/filters';
import { API_BASE } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import ItineraryModal from '../../components/ItineraryModal';
import StarRating from '../../components/StarRating';

export default function MyBookings({ setCurrentView, onPayBooking, onGiveFeedback }) {
  const [bookings, setBookings] = useState([]);
  const [viewState, setViewState] = useState('list');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  // The separate "My Itineraries" page is gone: a customer reads the itinerary
  // for the booking they are looking at, here, rather than going to a list of
  // everyone's itineraries and working out which one is theirs.
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [payments, setPayments] = useState([]);
  const [feedback, setFeedback] = useState([]);
  // The booking whose "Payment needed first" notice is open.
  const [paymentNoticeFor, setPaymentNoticeFor] = useState(null);
  // Fixes 8.1 / 8.2.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBookings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setBookings(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/payments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setPayments(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const fetchFeedback = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/feedback`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) setFeedback(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchBookings();
    fetchPayments();
    fetchFeedback();
  }, []);

  const countsTowardsBalance = (p) =>
    !['rejected', 'refunded'].includes((p.paymentStatus || '').toLowerCase());

  // A booking is Pending until the office confirms the payment as Paid. The
  // customer cannot open it until then.
  const isLocked = (b) => b.bookingStatus?.toLowerCase() === 'pending';

  // Payment details already sent in for this booking and not rejected or
  // refunded, i.e. waiting for the office to verify them.
  const hasSubmittedPayment = (b) =>
    payments.some(p => p.booking?.bookingId === b.bookingId && countsTowardsBalance(p));

  const handleView = (b) => {
    if (isLocked(b)) {
      setPaymentNoticeFor(b);
      return;
    }
    setSelectedBooking(b);
    setViewState('details');
  };

  const handleCancelBooking = async () => {
    // Fix 2.6: this used to PUT the whole booking to /api/bookings/{id}, which
    // customers are not allowed to call, so cancelling always failed with 403.
    // The status endpoint lets a customer cancel their own booking and nothing
    // else.
    if (!cancelReason) {
      alert('Please choose a reason for cancelling.');
      return;
    }
    try {
      const payload = {
        bookingStatus: 'Cancelled',
        note: `[Cancelled by Customer]: ${cancelReason}`
      };
      const res = await fetch(`${API_BASE}/api/bookings/${selectedBooking.bookingId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Booking cancelled successfully.');
        setShowCancelModal(false);
        setViewState('list');
        fetchBookings();
      } else {
        alert(await res.text());
      }
    } catch (e) { alert(e); }
  };

  if (viewState === 'details' && selectedBooking && !isLocked(selectedBooking)) {
    // Fix 6.6: this summed every payment on the booking, including Rejected
    // and Refunded ones, so a rejected payment made the booking look paid and
    // hid the Pay Now button.
    const bookingPayments = payments.filter(p => p.booking?.bookingId === selectedBooking.bookingId);
    const amountPaid = bookingPayments.filter(countsTowardsBalance).reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAmount = selectedBooking.totalAmount || 0;
    const balance = Math.max(0, totalAmount - amountPaid);
    
    const isCompleted = selectedBooking.bookingStatus?.toLowerCase() === 'completed';
    const myFeedback = feedback.find(f => f.booking?.bookingId === selectedBooking.bookingId);

    let paymentStatusBadge = <span className="bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium">Unpaid</span>;
    if (amountPaid >= totalAmount && totalAmount > 0) paymentStatusBadge = <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">Fully Paid</span>;
    else if (amountPaid > 0) paymentStatusBadge = <span className="bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">Partially Paid</span>;

    return (
      <div className="max-w-5xl mx-auto space-y-6 relative">
        <p className="text-gray-500 mb-6 text-sm">View your confirmed booking, itinerary and assigned trip team.</p>
        
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-100 p-4 border-b border-gray-200 font-bold text-sm">Booking Reference</div>
              <div className="p-6 grid grid-cols-[150px_1fr] gap-y-4 text-sm items-center">
                <div className="font-medium text-gray-700">Booking ID</div><div className="font-bold">BK-{selectedBooking.bookingId}</div>
                <div className="font-medium text-gray-700">Quotation ID</div><div>{selectedBooking.quotation?.quotationId ? `QT-${selectedQuotationId(selectedBooking)}` : 'N/A'}</div>
                <div className="font-medium text-gray-700">Tour Package</div><div>{selectedBooking.tourPackage?.packageName || 'Custom Package'}</div>
                <div className="font-medium text-gray-700">Itinerary</div><div>{selectedBooking.itinerary?.itineraryName || 'N/A'}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-100 p-4 border-b border-gray-200 font-bold text-sm">Travel Details</div>
              <div className="p-6 space-y-4 text-sm">
                <div className="grid grid-cols-[150px_1fr] items-center"><div className="font-medium text-gray-700">Start Date</div><div>{selectedBooking.travelStartDate || 'N/A'}</div></div>
                <div className="grid grid-cols-[150px_1fr] items-center"><div className="font-medium text-gray-700">End Date</div><div>{selectedBooking.travelEndDate || 'N/A'}</div></div>
                <div className="grid grid-cols-[150px_1fr] items-center"><div className="font-medium text-gray-700">Travellers</div><div>{selectedBooking.numberOfPeople}</div></div>
                
                <div className="grid grid-cols-[150px_1fr] items-center bg-orange-50 p-4 rounded border border-orange-100 font-bold text-[#f97316]">
                  <div>Total Amount</div><div>USD {totalAmount}</div>
                </div>

                <div className="grid grid-cols-[150px_1fr] pt-2 items-center"><div className="font-medium text-gray-700">Status</div><div><StatusBadge fallback="Pending" status={selectedBooking.bookingStatus} /></div></div>
                <div className="grid grid-cols-[150px_1fr] items-start"><div className="font-medium text-gray-700 mt-1">Notes</div><div className="text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap">{selectedBooking.notes || 'None'}</div></div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              {(selectedBooking.bookingStatus?.toLowerCase() === 'pending' || selectedBooking.bookingStatus?.toLowerCase() === 'confirmed') && (
                <button onClick={() => setShowCancelModal(true)} className="px-4 py-2 border border-red-500 text-red-500 rounded text-sm font-medium hover:bg-red-50 mr-auto">Cancel Booking</button>
              )}
              <div className={selectedBooking.bookingStatus?.toLowerCase() === 'cancelled' || selectedBooking.bookingStatus?.toLowerCase() === 'completed' ? 'ml-auto flex gap-3' : 'flex gap-3'}>
                <button onClick={() => setViewState('list')} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Back</button>
                <button onClick={() => setShowItineraryModal(true)} className="px-4 py-2 border border-[#f97316] text-[#f97316] rounded text-sm font-medium hover:bg-orange-50">View Itinerary</button>
                <button onClick={() => { if(setCurrentView) setCurrentView('/my-payments'); }} className={isCompleted ? 'px-4 py-2 border border-[#f97316] text-[#f97316] rounded text-sm font-medium hover:bg-orange-50' : 'px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600'}>View Payments</button>
                {isCompleted && (
                  <button onClick={() => onGiveFeedback && onGiveFeedback(selectedBooking.bookingId)} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">{myFeedback ? 'View Feedback' : 'Give Feedback'}</button>
                )}
              </div>
            </div>
          </div>
          
          <div className="col-span-1 space-y-6">
            {isCompleted && (
              <div className="bg-white rounded-lg border border-[#f97316] shadow-sm p-6 h-fit">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-sm">{myFeedback ? 'Your feedback' : 'Rate your trip'}</h3>
                  {!myFeedback && <span className="text-[10px] font-semibold text-[#f97316] bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5">New</span>}
                </div>
                {myFeedback ? (
                  <>
                    <div className="my-3"><StarRating value={myFeedback.rating} size={18} /></div>
                    <button onClick={() => onGiveFeedback && onGiveFeedback(selectedBooking.bookingId)} className="px-4 py-2 border border-[#f97316] text-[#f97316] rounded text-xs font-medium hover:bg-orange-50">View Feedback</button>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-3">Your tour is complete. Tell us how it went.</p>
                    <div className="mb-4"><StarRating value={0} size={18} /></div>
                    <button onClick={() => onGiveFeedback && onGiveFeedback(selectedBooking.bookingId)} className="px-4 py-2 bg-[#f97316] text-white rounded text-xs font-medium hover:bg-orange-600">Give Feedback</button>
                  </>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-fit">
              <h3 className="font-bold mb-4 text-sm">Your Trip Team</h3>
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-bold text-xs mb-1">Driver</p>
                  {selectedBooking.driver ? (
                    <>
                      <p>{selectedBooking.driver.driverName} (DRV-{selectedBooking.driver.driverId})</p>
                      <p className="text-gray-500 text-xs">{selectedBooking.driver.phone}, {selectedBooking.driver.experienceYears} years experience</p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic text-xs">A driver will be assigned closer to your trip date.</p>
                  )}
                </div>
                <div>
                  <p className="font-bold text-xs mb-1">Vehicle</p>
                  {selectedBooking.vehicle ? (
                    <>
                      <p>{selectedBooking.vehicle.vehicleType} {selectedBooking.vehicle.model} (VEH-{selectedBooking.vehicle.vehicleId})</p>
                      <p className="text-gray-500 text-xs">Reg. {selectedBooking.vehicle.registrationNo}, seats {selectedBooking.vehicle.capacity}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic text-xs">A vehicle will be assigned closer to your trip date.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-fit">
              <h3 className="font-bold mb-4 text-sm">Payment Summary</h3>
              <div className="space-y-2 text-sm border-b border-gray-100 pb-4 mb-4">
                <div className="flex justify-between"><span className="text-gray-600">Total</span><span className="font-bold">USD {totalAmount}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Paid</span><span className="font-bold text-green-600">USD {amountPaid}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Balance</span><span className="font-bold">USD {balance}</span></div>
              </div>
              <div>{paymentStatusBadge}</div>
            </div>
          </div>
        </div>

        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="font-bold text-lg mb-2">Cancel booking BK-{selectedBooking.bookingId}?</h3>
              <p className="text-sm text-gray-600 mb-4">This will cancel your {selectedBooking.tourPackage?.packageName} booking for {selectedBooking.travelStartDate}. Any refund on payments already made will be handled by our team under the cancellation policy.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason for cancelling *</label>
                  <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                    <option value="">Select a reason</option>
                    <option value="Personal emergency">Personal emergency</option>
                    <option value="Change of travel plans">Change of travel plans</option>
                    <option value="Flight cancellation">Flight cancellation</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Keep Booking</button>
                <button onClick={handleCancelBooking} className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700">Cancel Booking</button>
              </div>
            </div>
          </div>
        )}

        <ItineraryModal
          isOpen={showItineraryModal}
          onClose={() => setShowItineraryModal(false)}
          source={{ type: 'booking', id: selectedBooking.bookingId }}
          subtitle={`Booking BK-${selectedBooking.bookingId}`}
        />
      </div>
    );
  }

  function selectedQuotationId(b) {
    // Fix 6.7: this read b.inquiry?.quotation, but a Booking links straight to
    // its quotation - there is no `inquiry` field - so this always said N/A.
    return b.quotation?.quotationId || 'N/A';
  }

  const visibleBookings = applyFilters(bookings, {
    query: search,
    fields: [
      (b) => `BK-${b.bookingId}`,
      (b) => b.tourPackage?.packageName,
      'travelStartDate',
      'totalAmount'
    ],
    status: statusFilter,
    statusField: 'bookingStatus'
  });

  return (
    <div className="max-w-6xl mx-auto">
      <p className="text-gray-500 mb-6 text-sm">Track your tour bookings and booking status.</p>
      
      <div className="flex gap-4 mb-6">
        <input type="text" placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} className="bg-gray-100 border-none rounded px-4 py-2 text-sm w-64" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Confirmed">Confirmed</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-700">Booking ID</th>
              <th className="p-4 font-medium text-gray-700">Tour Package</th>
              <th className="p-4 font-medium text-gray-700">Travel Date</th>
              <th className="p-4 font-medium text-gray-700">Travellers</th>
              <th className="p-4 font-medium text-gray-700">Total Amount</th>
              <th className="p-4 font-medium text-gray-700">Status</th>
              <th className="p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleBookings.length > 0 ? (
              visibleBookings.map(b => (
                <tr key={b.bookingId} className="hover:bg-gray-50">
                  <td className="p-4">BK-{b.bookingId}</td>
                  <td className="p-4">{b.tourPackage?.packageName || 'Custom Package'}</td>
                  <td className="p-4">{b.travelStartDate || 'N/A'}</td>
                  <td className="p-4">{b.numberOfPeople}</td>
                  <td className="p-4">USD {b.totalAmount}</td>
                  <td className="p-4"><StatusBadge fallback="Pending" status={b.bookingStatus} /></td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => handleView(b)} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">View</button>
                    {((b.bookingStatus?.toLowerCase() === 'pending' || b.bookingStatus?.toLowerCase() === 'confirmed') && (b.totalAmount || 0) > payments.filter(p => p.booking?.bookingId === b.bookingId && countsTowardsBalance(p)).reduce((s, p) => s + (p.amount || 0), 0)) && (
                      <button onClick={() => { if (onPayBooking) onPayBooking(b.bookingId); else if (setCurrentView) setCurrentView('/my-payments'); }} className="bg-[#f97316] text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-600">Pay Now</button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">No bookings found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {paymentNoticeFor && (() => {
        const awaitingVerification = hasSubmittedPayment(paymentNoticeFor);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-[28rem] max-w-[92vw]">
              <h3 className="font-bold text-lg mb-2">
                {awaitingVerification ? 'Payment awaiting verification' : 'Payment needed first'}
              </h3>
              {awaitingVerification ? (
                <p className="text-sm text-gray-600 mb-6">
                  Thank you. We have received your payment details for booking BK-{paymentNoticeFor.bookingId} and our
                  team is verifying them. You will be able to view your booking as soon as the payment is confirmed.
                </p>
              ) : (
                <p className="text-sm text-gray-600 mb-6">
                  Booking BK-{paymentNoticeFor.bookingId} is pending until your payment has been made and confirmed by our team.
                  Please complete the payment to view your booking details.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => setPaymentNoticeFor(null)} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Close</button>
                {awaitingVerification ? (
                  <button onClick={() => { setPaymentNoticeFor(null); if (setCurrentView) setCurrentView('/my-payments'); }} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">View Payments</button>
                ) : (
                  <button onClick={() => { const id = paymentNoticeFor.bookingId; setPaymentNoticeFor(null); if (onPayBooking) onPayBooking(id); else if (setCurrentView) setCurrentView('/my-payments'); }} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">Pay Now</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
