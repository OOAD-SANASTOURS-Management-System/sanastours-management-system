import React, { useState, useEffect } from 'react';
import { applyFilters, checkTravelDates, todayIso, endDateFor } from '../../utils/filters';
import { API_BASE } from '../../api';
import StatusBadge from '../../components/StatusBadge';

export default function MyInquiries({ setCurrentView }) {
  const [inquiries, setInquiries] = useState([]);
  const [viewState, setViewState] = useState('list'); // list, new, edit, details
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [formData, setFormData] = useState({});
  // Fixes 8.1 / 8.2.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inquiries`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setInquiries(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  /**
   * The tour length belongs to the package, so when an inquiry is attached to
   * one the end date follows the start date and is not the customer's to
   * change. The server re-derives it on save either way; this keeps the form
   * honest about that instead of offering a field whose value is discarded.
   */
  const packageDuration = selectedInquiry?.tourPackage?.durationDays;
  const derivedEndDate = packageDuration
    ? endDateFor(formData.travelStartDate, packageDuration)
    : null;

  const handleCreateOrEdit = async (e) => {
    e.preventDefault();
    const isEdit = viewState === 'edit';
    const url = isEdit ? `${API_BASE}/api/inquiries/${selectedInquiry.inquiryId}` : `${API_BASE}/api/inquiries`;
    const method = isEdit ? 'PUT' : 'POST';

    // A new inquiry must be for a future date; an existing one can still be
    // corrected after its date has passed (matching the server's rule).
    const endDate = derivedEndDate || formData.travelEndDate;
    const dateError = checkTravelDates(formData.travelStartDate, endDate, { mustBeFuture: !isEdit });
    if (dateError) {
      alert(dateError);
      return;
    }
    if (!formData.numberOfTravellers || parseInt(formData.numberOfTravellers) < 1) {
      alert('Number of travellers must be at least 1.');
      return;
    }
    try {
      const payload = {
        ...formData,
        travelEndDate: endDate,
        numberOfTravellers: parseInt(formData.numberOfTravellers || 1),
        inquiryStatus: isEdit ? selectedInquiry.inquiryStatus : 'New'
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(isEdit ? 'Inquiry updated successfully!' : 'Inquiry submitted successfully!');
        setViewState('list');
        fetchData();
      } else {
        alert('Failed to save inquiry: ' + await res.text());
      }
    } catch (e) {
      alert('Error saving inquiry');
    }
  };

  if (viewState === 'new' || viewState === 'edit') {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        {/* Only reachable as 'edit' now - inquiries are created from a tour
            package, never from this page. */}
        <h2 className="text-xl font-bold mb-2">Edit Inquiry</h2>
        <p className="text-gray-500 mb-8 text-sm">
          {viewState === 'new' ? 'Tell us about your trip and we will prepare a quotation.' : 'Update your inquiry while it is still marked as New.'}
        </p>
        
        <form onSubmit={handleCreateOrEdit} className="space-y-6">
          {viewState === 'edit' && (
            <div className="bg-orange-50 border border-orange-200 p-4 rounded text-sm text-orange-800 mb-6">
              Editing Inquiry <strong>INQ-{selectedInquiry.inquiryId}</strong>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Travel Start Date *</label>
              <input type="date" required min={todayIso()} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" 
                value={formData.travelStartDate || ''} onChange={e => setFormData({...formData, travelStartDate: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Travel End Date{derivedEndDate ? '' : ' *'}
              </label>
              {derivedEndDate ? (
                <>
                  <input type="date" readOnly disabled value={derivedEndDate}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100 text-gray-500" />
                  <p className="text-xs text-gray-500 mt-1">
                    Set automatically - this tour runs {packageDuration} day{packageDuration === 1 ? '' : 's'}.
                  </p>
                </>
              ) : (
                <input type="date" required min={formData.travelStartDate || todayIso()} className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  value={formData.travelEndDate || ''} onChange={e => setFormData({...formData, travelEndDate: e.target.value})} />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Travellers *</label>
              <input type="number" required min="1" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" 
                value={formData.numberOfTravellers || ''} onChange={e => setFormData({...formData, numberOfTravellers: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination / Area *</label>
              <input type="text" required placeholder="e.g. Kandy, Ella" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" 
                value={formData.destinationArea || ''} onChange={e => setFormData({...formData, destinationArea: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation Requirement</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm" 
                value={formData.accommodationRequirement || ''} onChange={e => setFormData({...formData, accommodationRequirement: e.target.value})}>
                <option value="">Select</option>
                <option value="3-Star Hotel">3-Star Hotel</option>
                <option value="4-Star Hotel">4-Star Hotel</option>
                <option value="5-Star Hotel">5-Star Hotel</option>
                <option value="Boutique Villa">Boutique Villa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transportation Requirement</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                value={formData.transportationRequirement || ''} onChange={e => setFormData({...formData, transportationRequirement: e.target.value})}>
                <option value="">Select</option>
                <option value="Car (1-3 pax)">Car (1-3 pax)</option>
                <option value="Micro Van (4-6 pax)">Micro Van (4-6 pax)</option>
                <option value="Mini Coach (7-12 pax)">Mini Coach (7-12 pax)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Requests</label>
            <textarea rows="4" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Dietary needs, pickup details, special occasions..."
              value={formData.additionalRequests || ''} onChange={e => setFormData({...formData, additionalRequests: e.target.value})}></textarea>
          </div>

          {viewState === 'new' && <p className="text-xs text-gray-500">Your inquiry will be saved with the status New. Our team will start reviewing it shortly.</p>}

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setViewState('list')} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">
              {viewState === 'new' ? 'Submit Inquiry' : 'Update Inquiry'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (viewState === 'details' && selectedInquiry) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <p className="text-gray-500 mb-6 text-sm">View your inquiry and travel requirements.</p>
        
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
            <div className="grid grid-cols-[200px_1fr] gap-y-4 items-center">
              <div className="text-sm font-medium text-gray-700">Inquiry ID</div><div className="text-sm font-bold">INQ-{selectedInquiry.inquiryId}</div>
              <div className="text-sm font-medium text-gray-700">Travel Start Date</div><div className="text-sm">{selectedInquiry.travelStartDate || 'N/A'}</div>
              <div className="text-sm font-medium text-gray-700">Travel End Date</div><div className="text-sm">{selectedInquiry.travelEndDate || 'N/A'}</div>
              <div className="text-sm font-medium text-gray-700">Number of Travellers</div><div className="text-sm">{selectedInquiry.numberOfTravellers}</div>
              <div className="text-sm font-medium text-gray-700">Destination / Area</div><div className="text-sm">{selectedInquiry.destinationArea || 'N/A'}</div>
              <div className="text-sm font-medium text-gray-700">Accommodation</div><div className="text-sm">{selectedInquiry.accommodationRequirement || 'N/A'}</div>
              <div className="text-sm font-medium text-gray-700">Transportation</div><div className="text-sm">{selectedInquiry.transportationRequirement || 'N/A'}</div>
            </div>
            
            {selectedInquiry.rejectionReason && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Why we could not take this on</p>
                <p className="text-sm text-gray-700 bg-red-50 p-3 rounded border border-red-100 whitespace-pre-wrap">
                  {selectedInquiry.rejectionReason}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Additional Requests</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">{selectedInquiry.additionalRequests || 'None'}</p>
            </div>

            <div className="grid grid-cols-[200px_1fr] items-center">
              <div className="text-sm font-medium text-gray-700">Inquiry Status</div>
              <div><StatusBadge fallback="New" status={selectedInquiry.inquiryStatus} /></div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setViewState('list')} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Back</button>
              {selectedInquiry.inquiryStatus?.toLowerCase() === 'quoted' && setCurrentView && (
                <button onClick={() => setCurrentView('/my-quotations')} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">View Quotations</button>
              )}
            </div>
          </div>
          
          <div className="col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm p-6 h-fit">
            {/* Fix 8.9: this panel claimed to be "Tracking history
                automatically" but only ever rendered one row repeating the
                current status - no history is stored anywhere. It now says
                plainly what it knows. */}
            <h3 className="font-bold text-center mb-4">Where this stands</h3>
            <div className="flex justify-center mb-4">
              <StatusBadge fallback="New" status={selectedInquiry.inquiryStatus} />
            </div>
            <p className="text-xs text-gray-500 text-center">
              {{
                New: 'We have your inquiry and will review it shortly.',
                Reviewing: 'Our team is putting together options for you.',
                // Stays accurate after the quotation is accepted too, since
                // the inquiry is not moved on again at that point.
                'Quotation Sent': 'We have sent you a quotation - see My Quotations.',
                // The old spelling, on inquiries raised before the change.
                Quoted: 'We have sent you a quotation - see My Quotations.',
                Booked: 'This inquiry has been turned into a booking.',
                Rejected: 'We were not able to take this one on - see the reason above.',
                Cancelled: 'This inquiry was cancelled.'
              }[selectedInquiry.inquiryStatus] || 'We will be in touch shortly.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const visibleInquiries = applyFilters(inquiries, {
    query: search,
    fields: [(i) => `INQ-${i.inquiryId}`, 'destinationArea', 'numberOfTravellers', 'travelStartDate'],
    status: statusFilter,
    statusField: 'inquiryStatus'
  });

  return (
    <div className="max-w-6xl mx-auto">
      <p className="text-gray-500 mb-6 text-sm">Track your tour and transportation inquiries.</p>
      
      <div className="flex justify-between mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search inquiries..." value={search} onChange={e => setSearch(e.target.value)} className="bg-gray-100 border-none rounded px-4 py-2 text-sm w-64" />
          {/* An inquiry runs New -> Quotation Sent, and Rejected if the
              customer turns a quotation down. It is not moved on again when
              they accept: what happens next belongs to the booking. */}
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm bg-white">
            <option value="">All statuses</option>
            <option value="New">New</option>
            <option value="Quotation Sent">Quotation Sent</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        {/* No "+ New Inquiry": an inquiry is always about a tour package, so
            it is raised from the package's own Send Inquiry form. */}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-700">Inquiry ID</th>
              <th className="p-4 font-medium text-gray-700">Travel Date</th>
              <th className="p-4 font-medium text-gray-700">Destination</th>
              <th className="p-4 font-medium text-gray-700">Travellers</th>
              <th className="p-4 font-medium text-gray-700">Status</th>
              <th className="p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleInquiries.length > 0 ? visibleInquiries.map(inq => (
              <tr key={inq.inquiryId} className="hover:bg-gray-50">
                <td className="p-4">INQ-{inq.inquiryId}</td>
                <td className="p-4">{inq.travelStartDate || 'N/A'}</td>
                <td className="p-4">{inq.destinationArea || 'N/A'}</td>
                <td className="p-4">{inq.numberOfTravellers}</td>
                <td className="p-4"><StatusBadge fallback="New" status={inq.inquiryStatus} /></td>
                <td className="p-4 flex gap-2">
                  <button onClick={() => { setSelectedInquiry(inq); setViewState('details'); }} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs hover:bg-orange-50 font-medium">View</button>
                  {/* Only a New inquiry can still be changed, and the server
                      refuses the rest. A rejected or already-quoted one is
                      read-only, so no Edit button is offered at all rather
                      than a greyed-out one. */}
                  {['new', 'pending', ''].includes(String(inq.inquiryStatus || '').toLowerCase()) && (
                    <button onClick={() => { setSelectedInquiry(inq); setFormData(inq); setViewState('edit'); }} className="text-gray-500 border border-gray-300 px-3 py-1 rounded text-xs hover:bg-gray-100 font-medium">Edit</button>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" className="p-8 text-center text-gray-500">
                  No inquiries yet. Browse Tour Packages and use Send Inquiry on the one you like.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
