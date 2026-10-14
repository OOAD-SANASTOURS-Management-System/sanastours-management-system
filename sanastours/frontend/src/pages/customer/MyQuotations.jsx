import React, { useState, useEffect } from 'react';
import { applyFilters } from '../../utils/filters';
import { API_BASE } from '../../api';
import StatusBadge from '../../components/StatusBadge';

export default function MyQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [viewState, setViewState] = useState('list');
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectComments, setRejectComments] = useState('');
  // Fixes 8.1 / 8.2.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchQuotations = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/quotations`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setQuotations(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleAccept = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bookings/convert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        // Fix 4.1: say which quotation is being accepted. The server used to
        // guess by taking the last quotation on the inquiry, so accepting one
        // offer could book a different one's price.
        body: JSON.stringify({
          inquiryId: selectedQuotation.inquiry?.inquiryId,
          quotationId: selectedQuotation.quotationId
        })
      });
      if (res.ok) {
        alert('Quotation accepted. Your booking has been created and is Pending until your payment is made and confirmed by our team. Go to My Bookings to pay.');
        setViewState('list');
        fetchQuotations();
      } else {
        alert(await res.text());
      }
    } catch (e) { alert(e); }
  };

  const handleReject = async () => {
    // Fix 2.7: this used to PUT the whole quotation to /api/quotations/{id},
    // which is staff-only, so rejecting always failed with 403. The respond
    // endpoint records the rejection and its reason, and puts the inquiry back
    // to Reviewing so the office knows to re-quote.
    if (!rejectReason) {
      alert('Please choose a reason so we can prepare a better option.');
      return;
    }
    try {
      const payload = {
        response: 'Rejected',
        reason: rejectReason,
        comments: rejectComments
      };

      const res = await fetch(`${API_BASE}/api/quotations/${selectedQuotation.quotationId}/respond`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Quotation Rejected!');
        setShowRejectModal(false);
        setViewState('list');
        fetchQuotations();
      } else {
        alert(await res.text());
      }
    } catch (e) { alert(e); }
  };

  if (viewState === 'details' && selectedQuotation) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 relative">
        <p className="text-gray-500 mb-6 text-sm">View your quotation, pricing and validity information.</p>
        
        {selectedQuotation.quotationStatus?.toLowerCase() !== 'accepted' && selectedQuotation.quotationStatus?.toLowerCase() !== 'rejected' && (
          <div className="bg-orange-50 text-orange-800 p-4 rounded text-sm border border-orange-100">
            This quotation is valid until <span className="font-bold">{selectedQuotation.validUntil || 'TBD'}</span>. Accept it to continue to booking, or reject it if it does not suit you.
          </div>
        )}

        {/* The covering message the office wrote when sending this quotation. */}
        {selectedQuotation.adminMessage && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-gray-100 p-4 border-b border-gray-200 font-bold text-sm">Message from SANAS TOURS</div>
            <div className="p-6 text-sm text-gray-700 whitespace-pre-wrap">{selectedQuotation.adminMessage}</div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-100 p-4 border-b border-gray-200 font-bold text-sm">Quotation Information</div>
          <div className="p-6 grid grid-cols-[200px_1fr] gap-y-4 text-sm items-center">
            <div className="font-medium text-gray-700">Quotation ID</div><div className="font-bold">QT-{selectedQuotation.quotationId}</div>
            <div className="font-medium text-gray-700">Inquiry ID</div><div>INQ-{selectedQuotation.inquiry?.inquiryId}</div>
            <div className="font-medium text-gray-700">Tour Package</div><div>{selectedQuotation.tourPackage?.packageName || 'Custom Package'}</div>
            <div className="font-medium text-gray-700">Itinerary</div><div>{selectedQuotation.itinerary?.itineraryName || 'N/A'}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-6">
          <div className="bg-gray-100 p-4 border-b border-gray-200 font-bold text-sm">Pricing Details</div>
          <div className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-[200px_1fr] items-center"><div className="font-medium text-gray-700">Base Price</div><div>USD {selectedQuotation.basePrice}</div></div>
            <div className="grid grid-cols-[200px_1fr] items-center"><div className="font-medium text-gray-700">Additional Charges</div><div>USD {selectedQuotation.additionalCharges}</div></div>
            <div className="grid grid-cols-[200px_1fr] items-center"><div className="font-medium text-gray-700">Discount</div><div>USD {selectedQuotation.discount}</div></div>
            
            <div className="grid grid-cols-[200px_1fr] items-center bg-orange-50 p-4 rounded border border-orange-100 font-bold text-[#f97316]">
              <div>Total Amount</div><div>USD {selectedQuotation.totalAmount}</div>
            </div>

            <div className="grid grid-cols-[200px_1fr] pt-2 items-center"><div className="font-medium text-gray-700">Valid Until</div><div>{selectedQuotation.validUntil || 'TBD'}</div></div>
            <div className="grid grid-cols-[200px_1fr] items-center"><div className="font-medium text-gray-700">Status</div><div><StatusBadge fallback="Draft" status={selectedQuotation.quotationStatus} audience="customer" /></div></div>
            <div className="grid grid-cols-[200px_1fr] items-start"><div className="font-medium text-gray-700 mt-1">Notes</div><div className="text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap">{selectedQuotation.notes || 'None'}</div></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={() => setViewState('list')} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Back</button>
          
          {(selectedQuotation.quotationStatus?.toLowerCase() === 'sent to customer' || selectedQuotation.quotationStatus?.toLowerCase() === 'sent') && (
            <>
              <button onClick={() => setShowRejectModal(true)} className="px-4 py-2 border border-red-500 text-red-500 rounded text-sm font-medium hover:bg-red-50">Reject Quotation</button>
              <button onClick={handleAccept} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">Accept Quotation</button>
            </>
          )}
        </div>

        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-96">
              <h3 className="font-bold text-lg mb-2">Reject quotation QT-{selectedQuotation.quotationId}?</h3>
              <p className="text-sm text-gray-600 mb-4">Let us know why so we can prepare a better option for you. You can send a new inquiry at any time.</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Reason *</label>
                  <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
                    <option value="">Select a reason</option>
                    <option value="Price too high">Price too high</option>
                    <option value="Dates don't match">Dates don't match</option>
                    <option value="Not interested anymore">Not interested anymore</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Comments</label>
                  <textarea className="w-full border border-gray-300 rounded px-3 py-2 text-sm" rows="3" placeholder="Tell us what you would like changed..." value={rejectComments} onChange={e => setRejectComments(e.target.value)}></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Keep Quotation</button>
                <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700">Reject Quotation</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const visibleQuotations = applyFilters(quotations, {
    query: search,
    fields: [
      (q) => `QT-${q.quotationId}`,
      (q) => `INQ-${q.inquiry?.inquiryId}`,
      (q) => q.tourPackage?.packageName,
      'totalAmount',
      'validUntil'
    ],
    status: statusFilter,
    statusField: 'quotationStatus'
  });

  return (
    <div className="max-w-6xl mx-auto">
      <p className="text-gray-500 mb-6 text-sm">Review quotations prepared for your inquiries and respond before they expire.</p>
      
      <div className="flex gap-4 mb-6">
        <input type="text" placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="bg-gray-100 border-none rounded px-4 py-2 text-sm w-64" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="Sent to Customer">Awaiting your response</option>
          <option value="Accepted">Accepted</option>
          <option value="Rejected">Rejected</option>
          <option value="Expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-700">Quotation ID</th>
              <th className="p-4 font-medium text-gray-700">Inquiry ID</th>
              <th className="p-4 font-medium text-gray-700">Package Name</th>
              <th className="p-4 font-medium text-gray-700">Total Amount</th>
              <th className="p-4 font-medium text-gray-700">Valid Until</th>
              <th className="p-4 font-medium text-gray-700">Status</th>
              <th className="p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleQuotations.length > 0 ? (
              visibleQuotations.map(q => (
                <tr key={q.quotationId} className="hover:bg-gray-50">
                  <td className="p-4">QT-{q.quotationId}</td>
                  <td className="p-4">INQ-{q.inquiry?.inquiryId}</td>
                  <td className="p-4">{q.tourPackage?.packageName || 'Custom Package'}</td>
                  <td className="p-4">USD {q.totalAmount}</td>
                  <td className="p-4">{q.validUntil || 'N/A'}</td>
                  <td className="p-4"><StatusBadge fallback="Draft" status={q.quotationStatus} audience="customer" /></td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => { setSelectedQuotation(q); setViewState('details'); }} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">View</button>
                    {(q.quotationStatus?.toLowerCase() === 'sent to customer' || q.quotationStatus?.toLowerCase() === 'sent') && (
                      <button onClick={() => { setSelectedQuotation(q); setViewState('details'); }} className="bg-[#f97316] text-white px-3 py-1 rounded text-xs font-medium hover:bg-orange-600">Respond</button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">No quotations found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
