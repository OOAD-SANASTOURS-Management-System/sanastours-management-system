import React, { useState, useEffect } from 'react';
import { applyFilters } from '../../utils/filters';
import { API_BASE } from '../../api';
import StatusBadge from '../../components/StatusBadge';

/**
 * Where customers transfer to. Shown on the payment form so they have the
 * details in front of them while they pay.
 */
const BANK_ACCOUNTS = [
  {
    bank: 'Bank of Ceylon',
    branch: 'Colombo Main Branch',
    accountName: 'Sanas Tours (Pvt) Ltd',
    accountNumber: '0072 4581 9930',
    swift: 'BCEYLKLX'
  },
  {
    bank: "People's Bank",
    branch: 'Kandy City Branch',
    accountName: 'Sanas Tours (Pvt) Ltd',
    accountNumber: '1184 6620 0471',
    swift: 'PSBKLKLX'
  }
];

export default function MyPayments({ setCurrentView, payForBooking, onPaymentFormClosed }) {
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [viewState, setViewState] = useState('list');
  const [selectedPayment, setSelectedPayment] = useState(null);
  // Payment ids that have a slip, so the list can show which do without
  // downloading any of the files.
  const [slipIds, setSlipIds] = useState([]);
  const [slipFile, setSlipFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    bookingId: '',
    // The amount is not typed in: it is what is still owed on the booking.
    paymentMethod: 'Bank Transfer',
    referenceNumber: '',
    notes: ''
  });
  // Fixes 8.1 / 8.2.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const [payRes, bookRes] = await Promise.all([
        fetch(`${API_BASE}/api/payments`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/bookings`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      if (payRes.ok) setPayments(await payRes.json());
      if (bookRes.ok) setBookings(await bookRes.json());

      const slipRes = await fetch(`${API_BASE}/api/payments/slips`, { headers: { Authorization: `Bearer ${token}` } });
      if (slipRes.ok) setSlipIds(await slipRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Arriving from "Pay Now" on a booking: open the form with that booking
  // already chosen.
  useEffect(() => {
    if (!payForBooking) return;
    setFormData({
      bookingId: String(payForBooking),
      paymentMethod: 'Bank Transfer',
      referenceNumber: '',
      notes: ''
    });
    setSlipFile(null);
    setViewState('new');
  }, [payForBooking]);

  const closeForm = () => {
    setViewState('list');
    setSlipFile(null);
    setFormData({ bookingId: '', paymentMethod: 'Bank Transfer', referenceNumber: '', notes: '' });
    if (onPaymentFormClosed) onPaymentFormClosed();
  };

  /** Open a stored slip. Needs the token, so it is fetched and shown as a blob. */
  const openSlip = async (paymentId) => {
    try {
      const res = await fetch(`${API_BASE}/api/payments/${paymentId}/slip`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) {
        alert('Could not open the slip.');
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      window.open(url, '_blank');
      // Let the new tab load before releasing the object URL.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (e) {
      alert(e);
    }
  };

  const handleMakePayment = async (e) => {
    e.preventDefault();
    if (!formData.bookingId) {
      alert('Please choose the booking you are paying for.');
      return;
    }
    const amount = amountDue;
    if (!amount || amount <= 0) {
      alert('There is nothing outstanding on this booking.');
      return;
    }
    if (slipFile && slipFile.type !== 'application/pdf' && !slipFile.name.toLowerCase().endsWith('.pdf')) {
      alert('The payment slip must be a PDF.');
      return;
    }
    if (slipFile && slipFile.size > 5 * 1024 * 1024) {
      alert('The payment slip must be 5 MB or smaller.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        bookingId: parseInt(formData.bookingId),
        // Sent for the record; the server recomputes and checks it against
        // the booking's outstanding balance either way.
        amount,
        referenceNumber: formData.referenceNumber,
        notes: formData.notes,
        paymentMethod: formData.paymentMethod
      };

      const res = await fetch(`${API_BASE}/api/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        alert(await res.text());
        return;
      }

      // The slip is attached to the payment that was just created, so it goes
      // up as a second request once we know the payment id.
      const created = await res.json();
      let slipWarning = '';
      if (slipFile && created?.paymentId) {
        const body = new FormData();
        body.append('file', slipFile);
        const slipRes = await fetch(`${API_BASE}/api/payments/${created.paymentId}/slip`, {
          method: 'POST',
          // No Content-Type here: the browser sets the multipart boundary.
          headers: { Authorization: `Bearer ${token}` },
          body
        });
        if (!slipRes.ok) {
          slipWarning = '\n\nThe payment was recorded, but the slip did not upload: '
            + (await slipRes.text()) + '\nYou can send it to us separately.';
        }
      }

      alert('Payment submitted. It stays Pending until our team verifies it against our bank records.' + slipWarning);
      closeForm();
      fetchData();
    } catch (e) {
      alert(e);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate stats
  const totalPaid = payments.filter(p => p.paymentStatus?.toLowerCase() === 'paid' || p.paymentStatus?.toLowerCase() === 'verified' || p.paymentStatus?.toLowerCase() === 'completed').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPending = payments.filter(p => p.paymentStatus?.toLowerCase() === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0);

  // Fix 6.8: the balance subtracted every payment the customer had ever made,
  // including payments against cancelled bookings, from the total of the live
  // bookings only - so a cancelled booking's payments reduced what was still
  // owed on the others. Work it out per live booking instead.
  const countsTowardsBalance = (p) =>
    !['rejected', 'refunded'].includes((p.paymentStatus || '').toLowerCase());
  const liveBookings = bookings.filter(b => b.bookingStatus?.toLowerCase() !== 'cancelled');
  const balanceDue = liveBookings.reduce((sum, b) => {
    const paidOnBooking = payments
      .filter(p => p.booking?.bookingId === b.bookingId && countsTowardsBalance(p))
      .reduce((s, p) => s + (p.amount || 0), 0);
    return sum + Math.max(0, (b.totalAmount || 0) - paidOnBooking);
  }, 0);

  /**
   * What the customer owes on the booking being paid.
   *
   * The booking total is the quotation total - base price plus additional
   * charges less the discount - so the breakdown is read off the quotation
   * and the amount is never typed in. Anything already paid is taken off, so
   * a second payment asks for the remainder rather than the whole trip again.
   */
  const payingFor = bookings.find(b => String(b.bookingId) === String(formData.bookingId));
  const quote = payingFor?.quotation;
  const basePrice = Number(quote?.basePrice ?? payingFor?.totalAmount ?? 0);
  const additionalCharges = Number(quote?.additionalCharges ?? 0);
  const discount = Number(quote?.discount ?? 0);
  const bookingTotal = Number(payingFor?.totalAmount ?? (basePrice + additionalCharges - discount));
  const alreadyPaid = payments
    .filter(p => p.booking?.bookingId === payingFor?.bookingId && countsTowardsBalance(p))
    .reduce((s, p) => s + (p.amount || 0), 0);
  const amountDue = Math.max(0, bookingTotal - alreadyPaid);

  if (viewState === 'new') {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <h2 className="text-xl font-bold mb-2">Submit Payment Details</h2>
        <p className="text-gray-500 mb-8 text-sm">Please transfer funds to our bank account and submit the receipt details here.</p>
        
        {/* Where to transfer. Shown before the form so the customer has the
            details while they are in their banking app. */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {BANK_ACCOUNTS.map((acct, i) => (
            <div key={i} className="border border-gray-200 rounded p-4 bg-gray-50 text-sm">
              <p className="font-bold mb-2">{acct.bank}</p>
              <dl className="space-y-1 text-gray-600">
                <div className="flex gap-2"><dt className="w-32 shrink-0">Account name</dt><dd className="font-medium text-gray-800">{acct.accountName}</dd></div>
                <div className="flex gap-2"><dt className="w-32 shrink-0">Account number</dt><dd className="font-mono font-medium text-gray-800">{acct.accountNumber}</dd></div>
                <div className="flex gap-2"><dt className="w-32 shrink-0">Branch</dt><dd>{acct.branch}</dd></div>
                <div className="flex gap-2"><dt className="w-32 shrink-0">SWIFT</dt><dd className="font-mono">{acct.swift}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mb-8">
          Please quote your booking reference (BK-{formData.bookingId || '...'}) on the transfer.
        </p>

        <form onSubmit={handleMakePayment} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking</label>
              {/* Chosen by the Pay Now button on the booking, so it is shown
                  rather than picked. Choosing it again here would only be a
                  chance to pay for the wrong trip. */}
              {payingFor ? (
                <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-100 text-gray-700">
                  BK-{payingFor.bookingId} - {payingFor.tourPackage?.packageName || 'Custom Package'}
                </div>
              ) : (
                <select required className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white" value={formData.bookingId} onChange={e => setFormData({...formData, bookingId: e.target.value})}>
                  <option value="">Select a booking</option>
                  {bookings.filter(b => b.bookingStatus?.toLowerCase() !== 'cancelled').map(b => {
                    const bPaid = payments.filter(p => p.booking?.bookingId === b.bookingId && countsTowardsBalance(p)).reduce((sum, p) => sum + (p.amount || 0), 0);
                    const bBal = Math.max(0, (b.totalAmount || 0) - bPaid);
                    return (
                      <option key={b.bookingId} value={b.bookingId}>BK-{b.bookingId} ({b.tourPackage?.packageName}) - Balance: USD {bBal}</option>
                    );
                  })}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
              <div className="w-full border border-gray-200 rounded px-3 py-2 text-sm bg-gray-100 font-bold text-[#f97316]">
                USD {amountDue.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Calculated from your quotation.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
              <select required className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white" value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})}>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference / Receipt No. *</label>
              <input type="text" required className="w-full border border-gray-300 rounded px-3 py-2 text-sm" value={formData.referenceNumber} onChange={e => setFormData({...formData, referenceNumber: e.target.value})} />
            </div>
          </div>

          {/* How the amount above was arrived at. */}
          {payingFor && (
            <div className="border border-gray-200 rounded p-4 text-sm">
              <p className="font-bold mb-3">How this amount is calculated</p>
              <div className="space-y-1 text-gray-600">
                <div className="flex justify-between"><span>Base price</span><span>USD {basePrice.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Additional charges</span><span>USD {additionalCharges.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Discount</span><span>- USD {discount.toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-1 mt-1 font-medium text-gray-800"><span>Booking total</span><span>USD {bookingTotal.toFixed(2)}</span></div>
                {alreadyPaid > 0 && (
                  <div className="flex justify-between"><span>Already paid</span><span>- USD {alreadyPaid.toFixed(2)}</span></div>
                )}
                <div className="flex justify-between border-t pt-1 mt-1 font-bold text-[#f97316]"><span>Amount due now</span><span>USD {amountDue.toFixed(2)}</span></div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Slip (PDF)</label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={e => setSlipFile(e.target.files?.[0] || null)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-orange-50 file:text-[#f97316]"
            />
            <p className="text-xs text-gray-500 mt-1">
              Attach the bank slip or transfer confirmation, up to 5 MB. This helps us verify your
              payment faster.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows="3" className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="e.g. Transferred from my HSBC account." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
          </div>

          <div className="bg-orange-50 p-4 rounded border border-orange-100 text-sm text-orange-800">
            Payments are marked <span className="font-bold">Pending</span> until our team verifies them against our bank records.
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={closeForm} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600 disabled:opacity-60">
              {submitting ? 'Submitting...' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (viewState === 'details' && selectedPayment) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-gray-500 mb-6 text-sm">View the payment information recorded for your booking.</p>
        
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-100 p-4 border-b border-gray-200 font-bold text-sm">Payment Information</div>
          <div className="p-6 grid grid-cols-[200px_1fr] gap-y-4 text-sm items-center">
            <div className="font-medium text-gray-700">Payment ID</div><div className="font-bold">PAY-{selectedPayment.paymentId}</div>
            <div className="font-medium text-gray-700">Booking ID</div><div>BK-{selectedPayment.booking?.bookingId}</div>
            <div className="font-medium text-gray-700">Total Booking Amount</div><div>USD {selectedPayment.booking?.totalAmount || 0}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-6">
          <div className="bg-gray-100 p-4 border-b border-gray-200 font-bold text-sm">Payment Details</div>
          <div className="p-6 space-y-4 text-sm">
            <div className="grid grid-cols-[200px_1fr] items-center"><div className="font-medium text-gray-700">Amount Paid</div><div className="font-bold text-[#f97316]">USD {selectedPayment.amount}</div></div>
            <div className="grid grid-cols-[200px_1fr] items-center"><div className="font-medium text-gray-700">Payment Date</div><div>{selectedPayment.paymentDate}</div></div>
            <div className="grid grid-cols-[200px_1fr] items-center"><div className="font-medium text-gray-700">Payment Method</div><div>{selectedPayment.paymentMethod}</div></div>
            <div className="grid grid-cols-[200px_1fr] items-center"><div className="font-medium text-gray-700">Reference / Receipt No.</div><div>{selectedPayment.referenceNumber || 'N/A'}</div></div>
            
            <div className="grid grid-cols-[200px_1fr] items-center">
              <div className="font-medium text-gray-700">Payment Slip</div>
              <div>
                {slipIds.includes(selectedPayment.paymentId) ? (
                  <button onClick={() => openSlip(selectedPayment.paymentId)} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">
                    Open slip (PDF)
                  </button>
                ) : (
                  <span className="text-gray-500">Not attached</span>
                )}
              </div>
            </div>
            <div className="grid grid-cols-[200px_1fr] pt-2 items-center"><div className="font-medium text-gray-700">Payment Status</div><div><StatusBadge fallback="Pending" status={selectedPayment.paymentStatus} /></div></div>
            <div className="grid grid-cols-[200px_1fr] items-start"><div className="font-medium text-gray-700 mt-1">Notes</div><div className="text-gray-600 bg-gray-50 p-3 rounded border border-gray-100 whitespace-pre-wrap">{selectedPayment.notes || 'None'}</div></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={() => setViewState('list')} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Back</button>
          <button onClick={() => { if(setCurrentView) setCurrentView('/my-bookings'); }} className="px-4 py-2 border border-[#f97316] text-[#f97316] rounded text-sm font-medium hover:bg-orange-50">View Booking</button>
          {/* Fix 8.8: this button only ran alert("Downloading receipt (PDF)...") -
              there is no receipt generation anywhere in the project. It now
              prints the page, which the browser can save as a PDF, rather than
              claiming to download something. */}
          <button onClick={() => window.print()} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">Print / Save as PDF</button>
        </div>
      </div>
    );
  }

  const visiblePayments = applyFilters(payments, {
    query: search,
    fields: [
      (p) => `PAY-${p.paymentId}`,
      (p) => `BK-${p.booking?.bookingId}`,
      'amount',
      'paymentDate',
      'paymentMethod',
      'referenceNumber'
    ],
    status: statusFilter,
    statusField: 'paymentStatus'
  });

  return (
    <div className="max-w-6xl mx-auto">
      <p className="text-gray-500 mb-6 text-sm">View your payment records and submit payments for your bookings.</p>
      
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
          <p className="text-gray-500 text-sm mb-2">Total Paid</p>
          <p className="text-3xl font-bold">USD {totalPaid}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center shadow-sm">
          <p className="text-gray-500 text-sm mb-2">Pending Verification</p>
          <p className="text-3xl font-bold">USD {totalPending}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-[#f97316] text-center shadow-sm">
          <p className="text-gray-500 text-sm mb-2">Balance Due</p>
          <p className="text-3xl font-bold text-[#f97316]">USD {balanceDue}</p>
        </div>
      </div>

      <div className="flex justify-between mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="bg-gray-100 border-none rounded px-4 py-2 text-sm w-64" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm bg-white">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Partial">Partial</option>
            <option value="Refunded">Refunded</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <button onClick={() => setViewState('new')} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium">+ Make Payment</button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-700">Payment ID</th>
              <th className="p-4 font-medium text-gray-700">Booking ID</th>
              <th className="p-4 font-medium text-gray-700">Amount</th>
              <th className="p-4 font-medium text-gray-700">Payment Date</th>
              <th className="p-4 font-medium text-gray-700">Method</th>
              <th className="p-4 font-medium text-gray-700">Status</th>
              <th className="p-4 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visiblePayments.length > 0 ? (
              visiblePayments.map(p => (
                <tr key={p.paymentId} className="hover:bg-gray-50">
                  <td className="p-4">PAY-{p.paymentId}</td>
                  <td className="p-4">BK-{p.booking?.bookingId}</td>
                  <td className="p-4">USD {p.amount}</td>
                  <td className="p-4">{p.paymentDate}</td>
                  <td className="p-4">{p.paymentMethod}</td>
                  <td className="p-4"><StatusBadge fallback="Pending" status={p.paymentStatus} /></td>
                  <td className="p-4">
                    <button onClick={() => { setSelectedPayment(p); setViewState('details'); }} className="text-[#f97316] border border-[#f97316] px-3 py-1 rounded text-xs font-medium hover:bg-orange-50">View</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">No payments found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
