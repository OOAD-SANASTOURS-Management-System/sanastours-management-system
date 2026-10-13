import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import GenericTable from '../components/GenericTable';
import { applyFilters, todayIso } from '../utils/filters';
import { API_BASE } from '../api';

const Quotations = () => {
  const [view, setView] = useState('list'); 
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [packages, setPackages] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  // Fixes 8.1 / 8.2.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    quotationId: null,
    inquiryId: '',
    packageId: '',
    itineraryId: '',
    basePrice: '',
    additionalCharges: '',
    discount: '',
    totalAmount: '',
    notes: '',
    quotationStatus: 'Sent to Customer',
    validUntil: ''
  });

  const fetchData = async () => {
    try {
      const inqRes = await fetch(`${API_BASE}/api/inquiries`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (inqRes.ok) setInquiries(await inqRes.json());

      const pkgRes = await fetch(`${API_BASE}/api/packages`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (pkgRes.ok) setPackages(await pkgRes.json());

      const itinRes = await fetch(`${API_BASE}/api/itineraries`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (itinRes.ok) setItineraries(await itinRes.json());

      const res = await fetch(`${API_BASE}/api/quotations`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.ok) {
        const data = await res.json();
        setQuotations(Array.isArray(data) ? data.map(q => ({
          ...q,
          id: `QT-${String(q.quotationId).padStart(3, '0')}`,
          customer: q.inquiry?.customer ? `${q.inquiry.customer.firstName} ${q.inquiry.customer.lastName}` : 'Unknown',
          inquiryIdDisplay: `INQ-${String(q.inquiry?.inquiryId).padStart(3, '0')}`,
          packageName: q.tourPackage?.packageName || 'Custom Package',
          totalDisplay: `USD ${q.totalAmount || 0}`,
          status: q.quotationStatus || 'Draft'
        })) : []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Quotation ID', accessor: 'id' },
    { header: 'Customer', accessor: 'customer' },
    { header: 'Inquiry ID', accessor: 'inquiryIdDisplay' },
    { header: 'Package Name', accessor: 'packageName' },
    { header: 'Total Amount', accessor: 'totalDisplay' },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  // Auto calculate total
  useEffect(() => {
    const base = parseFloat(formData.basePrice) || 0;
    const add = parseFloat(formData.additionalCharges) || 0;
    const disc = parseFloat(formData.discount) || 0;
    setFormData(prev => ({...prev, totalAmount: (base + add - disc).toFixed(2)}));
  }, [formData.basePrice, formData.additionalCharges, formData.discount]);

  const handleSave = async () => {
    if (!formData.inquiryId && view === 'add') {
      alert("Please select an Inquiry to quote.");
      return;
    }
    // Validation the form never had (fixes 7.4, 7.5).
    const base = parseFloat(formData.basePrice);
    if (!base || base <= 0) {
      alert('Base price must be greater than zero.');
      return;
    }
    if (parseFloat(formData.additionalCharges || 0) < 0 || parseFloat(formData.discount || 0) < 0) {
      alert('Additional charges and discount cannot be negative.');
      return;
    }
    if (parseFloat(formData.totalAmount) <= 0) {
      alert('The discount cannot be larger than the base price plus additional charges.');
      return;
    }
    if (!formData.validUntil) {
      alert('Please set how long the quotation is valid for.');
      return;
    }
    if (new Date(formData.validUntil) < new Date(todayIso())) {
      alert("The 'valid until' date cannot be in the past.");
      return;
    }
    if (!formData.packageId) {
      alert('Please choose a tour package so the booking can be created from this quotation.');
      return;
    }
    try {
      const isEdit = view === 'edit';
      const url = isEdit ? `${API_BASE}/api/quotations/${formData.quotationId}` : `${API_BASE}/api/quotations/create/${formData.inquiryId}`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        tourPackage: formData.packageId ? { packageId: formData.packageId } : null,
        itinerary: formData.itineraryId ? { itineraryId: parseInt(formData.itineraryId) } : null,
        basePrice: parseFloat(formData.basePrice) || 0,
        additionalCharges: parseFloat(formData.additionalCharges) || 0,
        discount: parseFloat(formData.discount) || 0,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        notes: formData.notes,
        validUntil: formData.validUntil || null,
        quotationStatus: formData.quotationStatus
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Quotation saved!');
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Failed to save quotation');
      }
    } catch(e) { alert(e); }
  };

  const handleDelete = async (row) => {
    if(window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        const res = await fetch(`${API_BASE}/api/quotations/${row.quotationId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
           alert('Deleted!');
           fetchData();
        } else {
           alert(await res.text() || 'Could not delete quotation');
        }
      } catch(e) { alert(e); }
    }
  };

  const getCustomerName = (inquiryId) => {
    if (!inquiryId) return '';
    const inq = inquiries.find(i => String(i.inquiryId) === String(inquiryId));
    if (inq && inq.customer) return `${inq.customer.firstName} ${inq.customer.lastName}`;
    return 'Unknown';
  };

  const renderList = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search quotations..." value={search} onChange={e => setSearch(e.target.value)} className="bg-[#e5e7eb] border-none rounded px-4 py-2 text-sm w-64 focus:outline-none" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-700 bg-white focus:outline-none">
            <option value="">All statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent to Customer">Sent to Customer</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
        <button onClick={() => { 
          setFormData({
            quotationId: null,
            inquiryId: '',
            packageId: '',
            itineraryId: '',
            basePrice: '',
            additionalCharges: '',
            discount: '',
            totalAmount: '',
            notes: '',
            quotationStatus: 'Sent to Customer',
            validUntil: ''
          }); 
          setView('add'); 
        }} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">
          + Create Quotation
        </button>
      </div>
      
      <GenericTable 
        columns={columns} 
        data={applyFilters(quotations, {
          query: search,
          fields: ['id', 'customer', 'inquiryIdDisplay', 'packageName', 'totalDisplay'],
          status: statusFilter,
          statusField: 'status'
        })} 
        onView={(row) => { 
          setSelectedQuotation(row); 
          setView('view'); 
        }} 
        onEdit={(row) => {
          // Fix 4.7: an accepted quotation has already been booked at that
          // price; the server refuses to change it.
          if (row.quotationStatus === 'Accepted') {
            alert('This quotation has been accepted and booked, so its pricing can no longer be changed. Issue a new quotation instead.');
            return;
          }
          setSelectedQuotation(row);
          setFormData({
            quotationId: row.quotationId,
            inquiryId: row.inquiry?.inquiryId || '',
            packageId: row.tourPackage?.packageId || '',
            itineraryId: row.itinerary?.itineraryId || '',
            basePrice: row.basePrice || '',
            additionalCharges: row.additionalCharges || '',
            discount: row.discount || '',
            totalAmount: row.totalAmount || '',
            notes: row.notes || '',
            quotationStatus: row.quotationStatus || 'Sent to Customer',
            validUntil: row.validUntil || ''
          });
          setView('edit');
        }}
        onDelete={handleDelete}
      />
    </div>
  );

  const renderForm = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">{view === 'add' ? 'Create Quotation' : 'Edit Quotation'}</h2>
        <p className="text-gray-500 mb-6">Update quotation pricing, validity, and status information.</p>
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <input type="text" value={getCustomerName(formData.inquiryId)} disabled className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-700" placeholder={view === 'add' ? 'Select an inquiry first' : ''} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inquiry *</label>
              {view === 'add' ? (
                <select value={formData.inquiryId} onChange={e => setFormData({...formData, inquiryId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Select an Inquiry</option>
                  {inquiries.map(inq => (
                    <option key={inq.inquiryId} value={inq.inquiryId}>INQ-{String(inq.inquiryId).padStart(3, '0')} - {inq.customer?.firstName} {inq.customer?.lastName}</option>
                  ))}
                </select>
              ) : (
                <input type="text" value={`INQ-${String(formData.inquiryId).padStart(3, '0')}`} disabled className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-700" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tour Package *</label>
              <select value={formData.packageId} onChange={e => setFormData({...formData, packageId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="">Select Tour Package</option>
                {packages.map(pkg => (
                  <option key={pkg.packageId} value={pkg.packageId}>{pkg.packageName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Itinerary</label>
              <select value={formData.itineraryId} onChange={e => setFormData({...formData, itineraryId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="">Select Itinerary</option>
                {itineraries.map(itin => (
                  <option key={itin.itineraryId} value={itin.itineraryId}>{itin.itineraryName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">USD</span>
                <input type="number" min="0" step="0.01" value={formData.basePrice} onChange={e => setFormData({...formData, basePrice: e.target.value})} className="w-full border border-gray-300 rounded pl-12 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Charges</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">USD</span>
                <input type="number" min="0" step="0.01" value={formData.additionalCharges} onChange={e => setFormData({...formData, additionalCharges: e.target.value})} className="w-full border border-gray-300 rounded pl-12 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">USD</span>
                <input type="number" min="0" step="0.01" value={formData.discount} onChange={e => setFormData({...formData, discount: e.target.value})} className="w-full border border-gray-300 rounded pl-12 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <div className="w-full rounded px-3 py-2 bg-[#fff7ed] text-[#f97316] font-bold text-center border border-[#ffedd5]">
                USD {formData.totalAmount}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
              <input type="date" min={todayIso()} value={formData.validUntil} onChange={e => setFormData({...formData, validUntil: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Special transportation and hotel requests."></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Status</label>
            <select value={formData.quotationStatus} onChange={e => setFormData({...formData, quotationStatus: e.target.value})} className="w-48 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
              <option value="Draft" className="bg-white text-gray-900">Draft</option>
              <option value="Sent to Customer" className="bg-white text-gray-900">Sent to Customer</option>
              <option value="Accepted" className="bg-white text-gray-900">Accepted</option>
              <option value="Rejected" className="bg-white text-gray-900">Rejected</option>
              <option value="Expired" className="bg-white text-gray-900">Expired</option>
            </select>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">{view === 'edit' ? 'Update Quotation' : 'Save Quotation'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderView = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">View Quotation</h2>
        <p className="text-gray-500 mb-6">Review pricing and customer details.</p>
        
        <div className="flex justify-between items-center mb-6 p-4 border border-gray-200 rounded bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-500">Quotation ID</p>
            <p className="font-semibold">{selectedQuotation?.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Inquiry ID</p>
            <p className="font-semibold">{selectedQuotation?.inquiryIdDisplay}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Amount</p>
            <p className="font-bold text-orange-600">{selectedQuotation?.totalDisplay}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <span className={`px-2 py-1 rounded text-xs text-white ${selectedQuotation?.quotationStatus === 'Accepted' ? 'bg-green-600' : (selectedQuotation?.quotationStatus === 'Rejected' ? 'bg-red-600' : 'bg-[#f97316]')}`}>{selectedQuotation?.quotationStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 max-w-md">
          <div className="text-sm font-medium text-gray-500">Customer Name</div>
          <div className="text-sm font-medium">{selectedQuotation?.customer}</div>
          
          <div className="text-sm font-medium text-gray-500">Package</div>
          <div className="text-sm font-medium">{selectedQuotation?.packageName}</div>
          
          <div className="text-sm font-medium text-gray-500">Itinerary</div>
          <div className="text-sm font-medium">{selectedQuotation?.itinerary?.itineraryName || 'N/A'}</div>

          <div className="text-sm font-medium text-gray-500">Base Price</div>
          <div className="text-sm font-medium">USD {selectedQuotation?.basePrice}</div>
          
          <div className="text-sm font-medium text-gray-500">Additional Charges</div>
          <div className="text-sm font-medium">USD {selectedQuotation?.additionalCharges}</div>
          
          <div className="text-sm font-medium text-gray-500">Discount</div>
          <div className="text-sm font-medium">USD {selectedQuotation?.discount}</div>

          <div className="text-sm font-medium text-gray-500">Valid Until</div>
          <div className="text-sm font-medium">{selectedQuotation?.validUntil || 'N/A'}</div>
          
          <div className="col-span-2 text-sm font-medium text-gray-500 mt-2">Notes</div>
          <div className="col-span-2 text-sm font-medium bg-gray-50 p-3 rounded border border-gray-100">{selectedQuotation?.notes || 'No additional notes provided.'}</div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
          <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Back</button>
          <button type="button" onClick={() => {
            setFormData({
              quotationId: selectedQuotation.quotationId,
              inquiryId: selectedQuotation.inquiry?.inquiryId || '',
              packageId: selectedQuotation.tourPackage?.packageId || '',
              itineraryId: selectedQuotation.itinerary?.itineraryId || '',
              basePrice: selectedQuotation.basePrice || '',
              additionalCharges: selectedQuotation.additionalCharges || '',
              discount: selectedQuotation.discount || '',
              totalAmount: selectedQuotation.totalAmount || '',
              notes: selectedQuotation.notes || '',
              quotationStatus: selectedQuotation.quotationStatus || 'Sent to Customer',
              validUntil: selectedQuotation.validUntil || ''
            });
            setView('edit');
          }} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Edit Quotation</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <Topbar title="Quotation Management" subtitle="Manage and send custom tour pricing proposals." />
      {view === 'list' && renderList()}
      {(view === 'add' || view === 'edit') && renderForm()}
      {view === 'view' && renderView()}
    </div>
  );
};

export default Quotations;
