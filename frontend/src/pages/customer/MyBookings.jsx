import React, { useState, useEffect } from 'react';

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  let bg = 'bg-gray-100';
  let text = 'text-gray-700';

  if (s === 'pending') { bg = 'bg-orange-500'; text = 'text-white'; }
  else if (s === 'confirmed' || s === 'completed') { bg = 'bg-green-600'; text = 'text-white'; }
  else if (s === 'ongoing') { bg = 'bg-blue-600'; text = 'text-white'; }
  else if (s === 'cancelled') { bg = 'bg-red-600'; text = 'text-white'; }

  return <span className={`px-2 py-1 rounded text-xs font-medium ${bg} ${text}`}>{status || 'Pending'}</span>;
};

export default function MyBookings({ setCurrentView }) {
  const [bookings, setBookings] = useState([]);
  const [viewState, setViewState] = useState('list');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [payments, setPayments] = useState([]);

  const fetchBookings = async () => {
    try {
      const res = await fetch('http://localhost:8081/api/bookings', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setBookings(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  const fetchPayments = async () => {
    try {
      const res = await fetch('http://localhost:8081/api/payments', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setPayments(await res.json());
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchBookings();
    fetchPayments();
  }, []);

  const handleCancelBooking = async () => {
    try {
      const payload = { ...selectedBooking, bookingStatus: 'Cancelled', notes: (selectedBooking.notes || '') + `\n\n[Cancelled by Customer]: ${cancelReason}` };
      const res = await fetch(`http://localhost:8081/api/bookings/${selectedBooking.bookingId}`, {
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

  if (viewState === 'details' && selectedBooking) {
    const bookingPayments = payments.filter(p => p.booking?.bookingId === selectedBooking.bookingId);
    const amountPaid = bookingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalAmount = selectedBooking.totalAmount || 0;
    const balance = Math.max(0, totalAmount - amountPaid);
    
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
                <div className="font-medium text-gray-700">Quotation ID</div><div>QT-{selectedQuotationId(selectedBooking)}</div>
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

                <div className="grid grid-cols-[150px_1fr] pt-2 items-center"><div className="font-medium text-gray-700">Status</div><div><StatusBadge status={selectedBooking.bookingStatus} /></div></div>
                <div className="grid grid-cols-[150px_1fr] items-start"><div className="font-medium text-gray-700 mt-1">Notes</div><div className="text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap">{selectedBooking.notes || 'None'}</div></div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              {(selectedBooking.bookingStatus?.toLowerCase() === 'pending' || selectedBooking.bookingStatus?.toLowerCase() === 'confirmed') && (
                <button onClick={() => setShowCancelModal(true)} className="px-4 py-2 border border-red-500 text-red-500 rounded text-sm font-medium hover:bg-red-50 mr-auto">Cancel Booking</button>
              )}
              <div className={selectedBooking.bookingStatus?.toLowerCase() === 'cancelled' || selectedBooking.bookingStatus?.toLowerCase() === 'completed' ? 'ml-auto flex gap-3' : 'flex gap-3'}>
                <button onClick={() => setViewState('list')} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Back</button>
                <button onClick={() => { if(setCurrentView) setCurrentView('/my-itineraries'); }} className="px-4 py-2 border border-[#f97316] text-[#f97316] rounded text-sm font-medium hover:bg-orange-50">View Itineraries</button>
                <button onClick={() => { if(setCurrentView) setCurrentView('/my-payments'); }} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">View Payments</button>
              </div>
            </div>
          </div>
          
          <div className="col-span-1 space-y-6">
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
      </div>
    );
  }

  function selectedQuotationId(b) {
    // The API doesn't return the quotation natively since Booking only links to Inquiry.
    // In a real scenario you'd join this, but we'll leave it as N/A if missing.
    return b.inquiry?.quotation?.quotationId || 'N/A';
  }

  return (
    <div className="max-w-6xl mx-auto">
      <p className="text-gray-500 mb-6 text-sm">Track your tour bookings and booking status.</p>
      
      <div className="flex gap-4 mb-6">
        <input type="text" placeholder="Search bookings..." className="bg-gray-100 border-none rounded px-4 py-2 text-sm w-64" />
        <select className="border border-gray-300 rounded px-4 py-2 text-sm bg-white"><option>Status</option></select>
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
            {bookings.length > 0 ? (
              bookings.map(b => (
                <tr key={b.bookingId} className="hover:bg-gray-50">
                  <td className="p-4">BK-{b.bookingId}</td>
                  <td className="p-4">{b.tourPackage?.packageName || 'Custom Package'}</td>
                  <td className="p-4">{b.travelStartDate || 'N/A'}</td>
                  <td className="p-4">{b.numberOfPeople}</td>
                  <td className="p-4">USD {b.totalAmount}</td>
                  <td className="p-4"><StatusBadge status={b.bookingStatus} /></td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => { setSelectedBooking(b); setViewState('details'); }} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">View</button>
                    {((b.bookingStatus?.toLowerCase() === 'pending' || b.bookingStatus?.toLowerCase() === 'confirmed') && (b.totalAmount || 0) > payments.filter(p => p.booking?.bookingId === b.bookingId).reduce((s, p) => s + (p.amount || 0), 0)) && (
                      <button onClick={() => { if(setCurrentView) setCurrentView('/my-payments'); }} className="bg-[#f97316] text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-600">Pay Now</button>
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
    </div>
  );
}
