import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import GenericTable from '../components/GenericTable';
import { applyFilters, checkTravelDates, todayIso, endDateFor } from '../utils/filters';
import { API_BASE } from '../api';

const Inquiries = () => {
  const [view, setView] = useState('list');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [customers, setCustomers] = useState([]);
  // Fixes 8.1 / 8.2: these two controls were decorative.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [formData, setFormData] = useState({
    customerId: '',
    travelStartDate: '',
    travelEndDate: '',
    numberOfTravellers: '',
    destinationArea: '',
    accommodationRequirement: '',
    transportationRequirement: '',
    additionalRequests: '',
    inquiryStatus: 'New'
  });

  // Sending a quotation is its own action with its own screen, in place of
  // the old "Edit Inquiry". What the customer told us is read-only here; the
  // office fills in the price and a covering message.
  // No basePrice here: it is the selected package's own price, so it is
  // derived from the dropdown rather than typed in and kept in step by hand.
  const [quoteForm, setQuoteForm] = useState({
    packageId: '',
    additionalCharges: '0',
    discount: '0',
    validUntil: '',
    adminMessage: '',
    notes: ''
  });
  const [packages, setPackages] = useState([]);
  const [sending, setSending] = useState(false);
  // Rejecting an inquiry is the other thing the office can do with one, and
  // it asks for a reason because the customer is shown it.
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inquiries`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.ok) {
        const data = await res.json();
        const formattedData = data.map(item => ({
          ...item,
          id: `INQ-${item.inquiryId.toString().padStart(3, '0')}`,
          name: item.customer ? `${item.customer.firstName} ${item.customer.lastName}` : 'Unknown',
          formattedTravelDate: formatDate(item.travelStartDate)
        }));
        setInquiries(formattedData);
      }
      
      const custRes = await fetch(`${API_BASE}/api/customers`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (custRes.ok) {
        setCustomers(await custRes.json());
      }

      const pkgRes = await fetch(`${API_BASE}/api/packages`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (pkgRes.ok) {
        setPackages(await pkgRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleDelete = async (row) => {
    if (window.confirm('Are you sure you want to delete this inquiry?')) {
      try {
        const res = await fetch(`${API_BASE}/api/inquiries/${row.inquiryId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
          fetchData();
        } else {
          const text = await res.text();
          alert('Failed to delete: ' + text);
        }
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const handleSave = async () => {
    // Validation the form never had (fixes 7.1, 7.2, 7.3).
    if (!formData.customerId) {
      alert('Please choose a customer.');
      return;
    }
    const endDate = editingPackageDuration
      ? endDateFor(formData.travelStartDate, editingPackageDuration)
      : formData.travelEndDate;
    const dateError = checkTravelDates(formData.travelStartDate, endDate, { mustBeFuture: view === 'add' });
    if (dateError) {
      alert(dateError);
      return;
    }
    if (!formData.numberOfTravellers || parseInt(formData.numberOfTravellers) < 1) {
      alert('Number of travellers must be at least 1.');
      return;
    }
    if (!formData.destinationArea?.trim()) {
      alert('Please enter the destination or area.');
      return;
    }
    try {
      const payload = {
        ...formData,
        travelEndDate: endDate,
        customer: { customerId: formData.customerId }
      };
      
      const url = view === 'edit' ? `${API_BASE}/api/inquiries/${selectedInquiry.inquiryId}` : `${API_BASE}/api/inquiries`;
      const method = view === 'edit' ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        fetchData();
        setView('list');
      } else {
        const text = await res.text();
        alert('Failed to save: ' + text);
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  /**
   * The duration of the package the inquiry being edited was raised from, or
   * null for an inquiry the office entered by hand with no package.
   */
  const editingPackageDuration =
    view === 'edit' ? selectedInquiry?.tourPackage?.durationDays || null : null;

  /**
   * A quotation can be sent for any live inquiry. Rejecting is the office
   * closing the inquiry for good, so nothing follows it. An inquiry already
   * converted to a booking is refused by the server, which checks the
   * bookings rather than the inquiry status ('Booked' only appears on rows
   * written before that change).
   */
  const canQuote = (status) =>
    !['booked', 'rejected', 'cancelled'].includes(String(status || '').toLowerCase());

  const handleRejectInquiry = async () => {
    if (!rejectReason.trim()) {
      alert('Please give the customer a reason.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/inquiries/${selectedInquiry.inquiryId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ reason: rejectReason.trim() })
      });
      if (res.ok) {
        alert('Inquiry rejected. The customer will see the reason.');
        setShowRejectModal(false);
        setRejectReason('');
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Could not reject the inquiry.');
      }
    } catch (e) {
      alert(e);
    }
  };

  /** Open the Send Quotation screen for the inquiry being viewed. */
  const startQuotation = (inquiry) => {
    // 30 days' validity is the usual offer; the office can change it.
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);

    setQuoteForm({
      packageId: inquiry?.tourPackage?.packageId || '',
      additionalCharges: '0',
      discount: '0',
      validUntil: validUntil.toISOString().slice(0, 10),
      adminMessage: '',
      notes: ''
    });
    setView('quote');
  };

  /**
   * The base price is the selected package's price, not a number the office
   * types. Anything specific to this trip belongs in additional charges or
   * the discount, which keeps the quotation traceable back to the price list.
   */
  const quotePackage = packages.find(p => p.packageId === quoteForm.packageId);
  const quoteBasePrice = Number(quotePackage?.price) || 0;

  const total = () =>
    quoteBasePrice
    + (parseFloat(quoteForm.additionalCharges) || 0)
    - (parseFloat(quoteForm.discount) || 0);

  const handleSendQuotation = async () => {
    if (!quoteForm.packageId) {
      alert('Please choose the tour package this quotation is for.');
      return;
    }
    if (quoteBasePrice <= 0) {
      alert(`${quotePackage?.packageName || 'This package'} has no base price set. Set its price in Tour Packages first.`);
      return;
    }
    if ((parseFloat(quoteForm.additionalCharges) || 0) < 0) {
      alert('Additional charges cannot be negative.');
      return;
    }
    if ((parseFloat(quoteForm.discount) || 0) < 0) {
      alert('Discount cannot be negative.');
      return;
    }
    if (total() <= 0) {
      alert('The discount cannot be larger than the base price plus additional charges.');
      return;
    }
    if (!quoteForm.validUntil) {
      alert('Please set how long the quotation is valid for.');
      return;
    }
    if (quoteForm.validUntil < todayIso()) {
      alert("The 'valid until' date cannot be in the past.");
      return;
    }
    setSending(true);
    try {
      const payload = {
        tourPackage: { packageId: quoteForm.packageId },
        basePrice: quoteBasePrice,
        additionalCharges: parseFloat(quoteForm.additionalCharges) || 0,
        discount: parseFloat(quoteForm.discount) || 0,
        validUntil: quoteForm.validUntil,
        // Optional: an empty message simply means no covering note, and the
        // customer's quotation screen leaves that panel out entirely.
        adminMessage: quoteForm.adminMessage?.trim() || null,
        notes: quoteForm.notes?.trim() || null,
        // The inquiry moves to "Quotation Sent" on the server as a result of
        // this status; it is never set by hand on the inquiry screen.
        quotationStatus: 'Sent to Customer'
      };

      const res = await fetch(`${API_BASE}/api/quotations/create/${selectedInquiry.inquiryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Quotation sent to the customer.');
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Failed to send the quotation.');
      }
    } catch (e) {
      alert(e);
    } finally {
      setSending(false);
    }
  };

  const renderList = () => (
    <div className="p-8">
      <div className="flex justify-between mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search inquiries..." value={search} onChange={e => setSearch(e.target.value)} className="bg-[#e5e7eb] border-none rounded px-4 py-2 text-sm font-medium w-64 focus:outline-none placeholder-gray-600" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none">
            <option value="">All statuses</option>
            <option value="New">New</option>
            <option value="Reviewing">Reviewing</option>
            <option value="Quotation Sent">Quotation Sent</option>
            <option value="Booked">Booked</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <button onClick={() => { 
          setFormData({
            customerId: '',
            travelStartDate: '',
            travelEndDate: '',
            numberOfTravellers: '',
            destinationArea: '',
            accommodationRequirement: '',
            transportationRequirement: '',
            additionalRequests: '',
            inquiryStatus: 'New'
          }); 
          setView('add'); 
        }} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">
          + Add Inquiry
        </button>
      </div>
      
      <GenericTable 
        columns={[
          { header: 'Inquiry ID', accessor: 'id' },
          { header: 'Name', accessor: 'name' },
          { header: 'Travel Date', accessor: 'formattedTravelDate' },
          { header: 'Destination', accessor: 'destinationArea' },
          { header: 'Travellers', accessor: 'numberOfTravellers' },
          { header: 'Status', accessor: 'inquiryStatus', isStatus: true }
        ]}
        data={applyFilters(inquiries, {
          query: search,
          fields: ['id', 'name', 'destinationArea', 'numberOfTravellers', 'formattedTravelDate'],
          status: statusFilter,
          statusField: 'inquiryStatus'
        })}
        onView={(row) => { 
          setSelectedInquiry(row); 
          setView('view'); 
        }} 
        onEdit={(row) => {
          setSelectedInquiry(row); 
          setFormData({
            customerId: row.customer?.customerId || '',
            travelStartDate: row.travelStartDate || '',
            travelEndDate: row.travelEndDate || '',
            numberOfTravellers: row.numberOfTravellers || '',
            destinationArea: row.destinationArea || '',
            accommodationRequirement: row.accommodationRequirement || '',
            transportationRequirement: row.transportationRequirement || '',
            additionalRequests: row.additionalRequests || '',
            inquiryStatus: row.inquiryStatus || 'New'
          });
          setView('edit'); 
        }}
        onDelete={handleDelete}
      />
    </div>
  );

  const renderForm = () => (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">{view === 'add' ? 'Add New Inquiry' : 'Edit Inquiry'}</h2>
        <p className="text-gray-500">Please fill in the inquiry details.</p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-4xl">
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" required>
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.customerId} value={c.customerId}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Travel Start Date *</label>
                <input type="date" min={todayIso()} value={formData.travelStartDate} onChange={e => setFormData({...formData, travelStartDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" required />
              </div>
              <div>
                {/* An inquiry raised from a package runs for that package's
                    duration, and the server re-derives the end date on save.
                    An inquiry entered by the office with no package still
                    needs both dates typed in. */}
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Travel End Date{editingPackageDuration ? '' : ' *'}
                </label>
                {editingPackageDuration ? (
                  <>
                    <input type="date" readOnly disabled
                      value={endDateFor(formData.travelStartDate, editingPackageDuration)}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-gray-500 bg-gray-100" />
                    <p className="text-xs text-gray-500 mt-1">
                      Set by the package duration ({editingPackageDuration} days).
                    </p>
                  </>
                ) : (
                  <input type="date" min={formData.travelStartDate || todayIso()} value={formData.travelEndDate} onChange={e => setFormData({...formData, travelEndDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" required />
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Travellers *</label>
              <input type="number" value={formData.numberOfTravellers} onChange={e => setFormData({...formData, numberOfTravellers: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" required />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destination / Area *</label>
              <input type="text" value={formData.destinationArea} onChange={e => setFormData({...formData, destinationArea: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500" required />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Accommodation Requirement</label>
              <select value={formData.accommodationRequirement} onChange={e => setFormData({...formData, accommodationRequirement: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="">Select</option>
                <option value="3-Star Hotel">3-Star Hotel</option>
                <option value="4-Star Hotel">4-Star Hotel</option>
                <option value="5-Star Hotel">5-Star Hotel</option>
                <option value="Boutique Villa">Boutique Villa</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transportation Requirement</label>
              <select value={formData.transportationRequirement} onChange={e => setFormData({...formData, transportationRequirement: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="">Select</option>
                <option value="Car (1-3 pax)">Car (1-3 pax)</option>
                <option value="Micro Van (4-6 pax)">Micro Van (4-6 pax)</option>
                <option value="Mini Coach (7-12 pax)">Mini Coach (7-12 pax)</option>
              </select>
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Requests</label>
              <textarea value={formData.additionalRequests} onChange={e => setFormData({...formData, additionalRequests: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-gray-600 h-24 focus:outline-none focus:ring-1 focus:ring-orange-500"></textarea>
            </div>
            
            {/* The status is no longer picked by hand. It follows the work:
                New when it arrives, Quotation Sent once a quotation goes out,
                Reviewing if the customer rejects it, Booked on conversion. */}
            {view === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inquiry Status</label>
                <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-100 text-gray-600">
                  {formData.inquiryStatus}
                </div>
                <p className="text-xs text-gray-500 mt-1">Set automatically as the inquiry progresses.</p>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-4 pt-6">
            <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Save Inquiry</button>
          </div>
        </form>
      </div>
    </div>
  );

  /** A read-only field on the Send Quotation screen. */
  const Fixed = ({ label, value }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-100 text-gray-600 min-h-[38px]">
        {value || 'N/A'}
      </div>
    </div>
  );

  const renderQuoteForm = () => (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Send Quotation</h2>
        <p className="text-gray-500">
          Price up {selectedInquiry?.id} for {selectedInquiry?.name} and send it to the customer.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-4xl">
        <form className="space-y-8">
          {/* What the customer told us. Read-only: changing their request
              here would quote them for something they did not ask for. */}
          <div>
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wide text-gray-500">The customer's request</h3>
            <div className="grid grid-cols-2 gap-6">
              <Fixed label="Customer" value={selectedInquiry?.name} />
              <Fixed label="Number of Travellers" value={selectedInquiry?.numberOfTravellers} />
              <Fixed label="Destination / Area" value={selectedInquiry?.destinationArea} />
              <Fixed label="Accommodation Requirement" value={selectedInquiry?.accommodationRequirement} />
              <Fixed label="Transportation Requirement" value={selectedInquiry?.transportationRequirement} />
              <Fixed
                label="Travel Dates"
                value={selectedInquiry?.travelStartDate
                  ? `${selectedInquiry.travelStartDate} to ${selectedInquiry.travelEndDate || 'TBD'}`
                  : 'TBD'}
              />
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Requests from the customer</label>
                <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-100 text-gray-600 min-h-[72px] whitespace-pre-wrap">
                  {selectedInquiry?.additionalRequests || 'None'}
                </div>
              </div>
            </div>
          </div>

          {/* The quotation itself. */}
          <div className="border-t pt-6">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wide text-gray-500">Quotation</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tour Package *</label>
                <select
                  value={quoteForm.packageId}
                  onChange={e => setQuoteForm({ ...quoteForm, packageId: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Select Tour Package</option>
                  {packages.map(p => (
                    <option key={p.packageId} value={p.packageId}>{p.packageName} ({p.packageId})</option>
                  ))}
                </select>
                {selectedInquiry?.tourPackage?.packageId && (
                  <p className="text-xs text-gray-500 mt-1">The customer enquired about this package.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                <input
                  type="date"
                  min={todayIso()}
                  value={quoteForm.validUntil}
                  onChange={e => setQuoteForm({ ...quoteForm, validUntil: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD)</label>
                <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-100 text-gray-600">
                  {quoteForm.packageId ? `USD ${quoteBasePrice.toFixed(2)}` : 'Choose a package'}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  The package's own price. Change it in Tour Packages, or adjust this quotation with
                  the charges and discount below.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional Charges (USD)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={quoteForm.additionalCharges}
                  onChange={e => setQuoteForm({ ...quoteForm, additionalCharges: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount (USD)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={quoteForm.discount}
                  onChange={e => setQuoteForm({ ...quoteForm, discount: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                <div className="w-full border border-orange-200 bg-orange-50 rounded px-3 py-2 text-sm font-bold text-[#f97316]">
                  USD {total().toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Base + charges - discount. Recalculated on the server.</p>
              </div>
            </div>
          </div>

          {/* The covering message that reaches the customer. */}
          <div className="border-t pt-6">
            <h3 className="font-bold mb-4 text-sm uppercase tracking-wide text-gray-500">Admin Message</h3>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message to the customer (optional)</label>
            <textarea
              value={quoteForm.adminMessage}
              onChange={e => setQuoteForm({ ...quoteForm, adminMessage: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-28 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="Explain what the price covers, answer their additional requests, suggest alternatives..."
            ></textarea>
            <p className="text-xs text-gray-500 mt-1">
              The customer sees this with the quotation in My Quotations. Leave it blank to send the
              quotation on its own.
            </p>

            <label className="block text-sm font-medium text-gray-700 mb-1 mt-4">Internal notes (optional)</label>
            <textarea
              value={quoteForm.notes}
              onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-16 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="For the office - shown on the quotation record."
            ></textarea>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t">
            <button type="button" onClick={() => setView('view')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button
              type="button"
              onClick={handleSendQuotation}
              disabled={sending}
              className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600 disabled:opacity-60"
            >
              {sending ? 'Sending...' : 'Send Quotation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-orange-500 text-white';
      // 'Quoted' is the old spelling, still on rows written before sending a
      // quotation became its own action.
      case 'Quotation Sent':
      case 'Quoted': return 'bg-green-600 text-white';
      case 'Reviewing': return 'bg-gray-500 text-white';
      case 'Booked': return 'bg-blue-600 text-white';
      case 'Cancelled': return 'bg-red-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const renderView = () => (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Inquiry Details</h2>
        <p className="text-gray-500">View customer inquiry and travel requirements.</p>
      </div>
      
      <div className="flex gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-8 flex-1">
          <div className="grid grid-cols-[200px_1fr] gap-y-6">
            <div className="text-sm font-bold text-gray-800">Inquiry ID</div>
            <div className="text-sm font-bold text-gray-800">{selectedInquiry?.id}</div>
            
            <div className="text-sm font-bold text-gray-800">Customer</div>
            <div className="text-sm text-gray-600">{selectedInquiry?.name}</div>
            
            <div className="text-sm font-bold text-gray-800">Travel Start Date</div>
            <div className="text-sm text-gray-600">{selectedInquiry?.travelStartDate}</div>
            
            <div className="text-sm font-bold text-gray-800">Travel End Date</div>
            <div className="text-sm text-gray-600">{selectedInquiry?.travelEndDate}</div>
            
            <div className="text-sm font-bold text-gray-800">Number of Travellers</div>
            <div className="text-sm text-gray-600">{selectedInquiry?.numberOfTravellers}</div>
            
            <div className="text-sm font-bold text-gray-800">Destination / Area</div>
            <div className="text-sm text-gray-600">{selectedInquiry?.destinationArea}</div>
            
            <div className="text-sm font-bold text-gray-800">Accommodation</div>
            <div className="text-sm text-gray-600">{selectedInquiry?.accommodationRequirement || 'N/A'}</div>

            <div className="text-sm font-bold text-gray-800">Transportation</div>
            <div className="text-sm text-gray-600">{selectedInquiry?.transportationRequirement || 'N/A'}</div>
            
            <div className="text-sm font-bold text-gray-800 mt-2">Additional Requests</div>
            <div className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{selectedInquiry?.additionalRequests || 'None'}</div>
            
            <div className="text-sm font-bold text-gray-800 mt-4">Inquiry Status</div>
            <div className="text-sm mt-4">
              <span className={`px-4 py-1.5 rounded text-sm font-medium ${getStatusColor(selectedInquiry?.inquiryStatus)}`}>
                {selectedInquiry?.inquiryStatus}
              </span>
            </div>

            {selectedInquiry?.rejectionReason && (
              <>
                <div className="text-sm font-bold text-gray-800 mt-4">Reason for rejection</div>
                <div className="text-sm text-gray-600 mt-4 whitespace-pre-wrap bg-red-50 border border-red-100 rounded p-3">
                  {selectedInquiry.rejectionReason}
                </div>
              </>
            )}
          </div>
          
          <div className="flex gap-4 mt-12 border-t border-gray-100 pt-8">
            <button type="button" onClick={() => setView('list')} className="px-8 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50 mr-auto">Back</button>
            {/* An inquiry on this screen is something to respond to, so the
                action is sending a quotation rather than editing what the
                customer wrote. */}
            {canQuote(selectedInquiry?.inquiryStatus) ? (
              <>
                <button
                  type="button"
                  onClick={() => { setRejectReason(''); setShowRejectModal(true); }}
                  className="px-8 py-2 border border-red-500 text-red-500 rounded font-medium hover:bg-red-50"
                >
                  Reject Inquiry
                </button>
                <button
                  type="button"
                  onClick={() => startQuotation(selectedInquiry)}
                  className="px-8 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600"
                >
                  Send Quotation
                </button>
              </>
            ) : (
              <span className="px-4 py-2 text-sm text-gray-500 self-center">
                {selectedInquiry?.inquiryStatus === 'Rejected'
                  ? 'This inquiry was rejected and is closed.'
                  : selectedInquiry?.inquiryStatus === 'Booked'
                    ? 'This inquiry has been converted to a booking.'
                    : `No quotation can be sent for a ${String(selectedInquiry?.inquiryStatus || '').toLowerCase()} inquiry.`}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <Topbar title="Inquiry Management" subtitle="Manage customer tour and transportation inquiries." />
      {view === 'list' && renderList()}
      {(view === 'add' || view === 'edit') && renderForm()}
      {view === 'view' && renderView()}
      {view === 'quote' && renderQuoteForm()}

      {showRejectModal && selectedInquiry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[460px]">
            <h3 className="font-bold text-lg mb-2">Reject inquiry {selectedInquiry.id}?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This closes the inquiry for good - no quotation can be sent for it afterwards, and any
              quotation already sent stops being acceptable. {selectedInquiry.name} will see the reason
              below in their My Inquiries.
            </p>

            <label className="block text-xs font-medium text-gray-700 mb-1">Reason *</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm h-24 focus:outline-none focus:ring-1 focus:ring-orange-500"
              placeholder="e.g. We have no vehicles available for those dates."
            ></textarea>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Keep Inquiry</button>
              <button onClick={handleRejectInquiry} className="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700">Reject Inquiry</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inquiries;
