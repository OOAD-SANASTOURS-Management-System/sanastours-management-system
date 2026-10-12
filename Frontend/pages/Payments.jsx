import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import GenericTable from '../components/GenericTable';
import { applyFilters } from '../utils/filters';
import { API_BASE } from '../api';

const Payments = () => {
  const [view, setView] = useState('list'); 
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  // Fixes 8.1 / 8.2.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    paymentId: null,
    bookingId: '',
    amount: '',
    paymentDate: '',
    referenceNumber: '',
    paymentStatus: 'Paid',
    // The payment_method column exists and the customer form collects it, but
    // the admin form did not, so a staff-entered payment had no method.
    paymentMethod: 'Bank Transfer',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const bRes = await fetch(`${API_BASE}/api/bookings`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (bRes.ok) setBookings(await bRes.json());

      const res = await fetch(`${API_BASE}/api/payments`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data) ? data.map(p => ({
          ...p,
          id: `PAY-${String(p.paymentId).padStart(3, '0')}`,
          bookingDisplay: p.booking?.bookingId ? `BK-${String(p.booking.bookingId).padStart(3, '0')}` : 'Unknown',
          customerDisplay: p.booking?.customer ? `${p.booking.customer.firstName} ${p.booking.customer.lastName}` : 'Unknown',
          amountDisplay: `USD ${p.amount || 0}`,
          dateDisplay: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          status: p.paymentStatus || 'Pending'
        })) : []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Payment ID', accessor: 'id' },
    { header: 'Booking ID', accessor: 'bookingDisplay' },
    { header: 'Customer', accessor: 'customerDisplay' },
    { header: 'Amount', accessor: 'amountDisplay' },
    { header: 'Payment Date', accessor: 'dateDisplay' },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  const handleSave = async () => {
    if (!formData.bookingId) {
      alert("Booking is required.");
      return;
    }
    // Fix 4.15: a negative or zero payment used to be accepted.
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      alert('The payment amount must be greater than zero.');
      return;
    }
    // Fix 4.14: warn before the server rejects an over-payment, and show the
    // remaining balance, which this screen never displayed.
    const booking = bookings.find(b => String(b.bookingId) === String(formData.bookingId));
    if (booking) {
      const counted = payments.filter(p =>
        p.booking?.bookingId === booking.bookingId &&
        p.paymentId !== formData.paymentId &&
        !['refunded', 'rejected'].includes((p.paymentStatus || '').toLowerCase())
      ).reduce((sum, p) => sum + (p.amount || 0), 0);
      const remaining = (booking.totalAmount || 0) - counted;
      if (!['Refunded', 'Rejected'].includes(formData.paymentStatus) && amount > remaining) {
        alert(`That exceeds the remaining balance of USD ${remaining.toFixed(2)} on this booking.`);
        return;
      }
    }
    try {
      const isEdit = view === 'edit';
      const url = isEdit ? `${API_BASE}/api/payments/${formData.paymentId}` : `${API_BASE}/api/payments/admin-create`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        booking: { bookingId: parseInt(formData.bookingId) },
        amount: parseFloat(formData.amount) || 0,
        paymentDate: formData.paymentDate || null,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Payment saved!');
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Failed to save payment');
      }
    } catch(e) { alert(e); }
  };

  const handleDelete = async (row) => {
    if(window.confirm('Are you sure you want to delete this payment record?')) {
      try {
        const res = await fetch(`${API_BASE}/api/payments/${row.paymentId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
           alert('Deleted!');
           fetchData();
        } else {
           alert(await res.text() || 'Could not delete payment');
        }
      } catch(e) { alert(e); }
    }
  };

  const renderList = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="bg-[#e5e7eb] font-semibold text-gray-700 border-none rounded px-4 py-2 text-sm w-64 focus:outline-none" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-600 focus:outline-none w-48">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Refunded">Refunded</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <button onClick={() => { 
          setFormData({
            paymentId: null,
            bookingId: '',
            amount: '',
            paymentDate: '',
            referenceNumber: '',
            paymentStatus: 'Paid',
            paymentMethod: 'Bank Transfer',
            notes: ''
          }); 
          setView('add'); 
        }} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">
          + Add Payment Record
        </button>
      </div>
      
      <GenericTable 
        columns={columns} 
        data={applyFilters(payments, {
          query: search,
          fields: ['id', 'bookingDisplay', 'customerDisplay', 'amountDisplay', 'referenceNumber'],
          status: statusFilter,
          statusField: 'status'
        })} 
        onView={(row) => { 
          setSelectedPayment(row); 
          setView('view'); 
        }} 
        onEdit={(row) => {
          setSelectedPayment(row);
          setFormData({
            paymentId: row.paymentId,
            bookingId: row.booking?.bookingId || '',
            amount: row.amount || '',
            paymentDate: row.paymentDate || '',
            referenceNumber: row.referenceNumber || '',
            paymentStatus: row.paymentStatus || 'Paid',
            paymentMethod: row.paymentMethod || 'Bank Transfer',
            notes: row.notes || ''
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
        <h2 className="text-xl font-bold mb-2">{view === 'add' ? 'Add Payment Record' : 'Edit Payment Record'}</h2>
        <p className="text-gray-500 mb-6">Record a new payment transaction against a customer booking.</p>
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Booking *</label>
              <select value={formData.bookingId} onChange={e => setFormData({...formData, bookingId: e.target.value})} disabled={view === 'edit'} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-100">
                <option value="">Choose Booking...</option>
                {bookings.map(b => (
                  <option key={b.bookingId} value={b.bookingId}>BK-{String(b.bookingId).padStart(3, '0')} - {b.customer?.firstName} {b.customer?.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input type="date" value={formData.paymentDate} onChange={e => setFormData({...formData, paymentDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">USD</span>
                <input type="number" min="0.01" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full border border-gray-300 rounded pl-12 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Reference No</label>
              <input type="text" value={formData.referenceNumber} onChange={e => setFormData({...formData, referenceNumber: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. TXN-987654321" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Credit Card">Credit Card</option>
                <option value="PayPal">PayPal</option>
                <option value="Cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select value={formData.paymentStatus} onChange={e => setFormData({...formData, paymentStatus: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Refunded">Refunded</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Wire transfer details, short payments, etc."></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">{view === 'edit' ? 'Update Payment' : 'Save Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderView = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Payment Details</h2>
        <p className="text-gray-500 mb-6">Review payment transaction and reference information.</p>
        
        <div className="flex justify-between items-center mb-6 p-4 border border-gray-200 rounded bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-500">Payment ID</p>
            <p className="font-semibold">{selectedPayment?.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Booking ID</p>
            <p className="font-semibold">{selectedPayment?.bookingDisplay}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Amount Paid</p>
            <p className="font-bold text-green-600">{selectedPayment?.amountDisplay}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <span className={`px-2 py-1 rounded text-xs text-white ${selectedPayment?.paymentStatus === 'Paid' ? 'bg-green-600' : (selectedPayment?.paymentStatus === 'Rejected' || selectedPayment?.paymentStatus === 'Refunded' ? 'bg-red-600' : 'bg-[#f97316]')}`}>{selectedPayment?.paymentStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 max-w-md">
          <div className="text-sm font-medium text-gray-500">Customer</div>
          <div className="text-sm font-medium">{selectedPayment?.customerDisplay}</div>
          
          <div className="text-sm font-medium text-gray-500">Payment Date</div>
          <div className="text-sm font-medium">{selectedPayment?.dateDisplay}</div>

          <div className="text-sm font-medium text-gray-500">Payment Method</div>
          <div className="text-sm font-medium">{selectedPayment?.paymentMethod || 'N/A'}</div>

          <div className="text-sm font-medium text-gray-500">Reference Number</div>
          <div className="text-sm font-medium">{selectedPayment?.referenceNumber || 'N/A'}</div>
          
          <div className="col-span-2 text-sm font-medium text-gray-500 mt-2">Notes</div>
          <div className="col-span-2 text-sm font-medium bg-gray-50 p-3 rounded border border-gray-100">{selectedPayment?.notes || 'No notes provided.'}</div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
          <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Back</button>
          <button type="button" onClick={() => {
            setFormData({
              paymentId: selectedPayment.paymentId,
              bookingId: selectedPayment.booking?.bookingId || '',
              amount: selectedPayment.amount || '',
              paymentDate: selectedPayment.paymentDate || '',
              referenceNumber: selectedPayment.referenceNumber || '',
              paymentStatus: selectedPayment.paymentStatus || 'Paid',
              paymentMethod: selectedPayment.paymentMethod || 'Bank Transfer',
              notes: selectedPayment.notes || ''
            });
            setView('edit');
          }} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Edit Payment</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <Topbar title="Payment Tracking" subtitle="Maintain customer payment records for tour bookings." />
      {view === 'list' && renderList()}
      {(view === 'add' || view === 'edit') && renderForm()}
      {view === 'view' && renderView()}
    </div>
  );
};

export default Payments;
