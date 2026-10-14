import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import GenericTable from '../components/GenericTable';
import { applyFilters, checkTravelDates } from '../utils/filters';
import { API_BASE } from '../api';

// Fix 6.1 / 6.2: one definition of the booking form's shape, used by the Add
// button, the list's Edit button and the View screen's Edit button. Previously
// each built its own object and two of them left fields out - which both made
// the inputs uncontrolled and silently cleared stored values on save.
const EMPTY_BOOKING_FORM = {
  bookingId: null,
  customerId: '',
  packageId: '',
  quotationId: '',
  itineraryId: '',
  numberOfPeople: '',
  totalAmount: '',
  bookingStatus: 'Confirmed',
  travelStartDate: '',
  travelEndDate: '',
  notes: '',
  driverId: '',
  vehicleId: '',
  initialLocation: '',
  returnDropOffLocation: ''
};

const toFormData = (b) => ({
  bookingId: b.bookingId,
  customerId: b.customer?.customerId || '',
  packageId: b.tourPackage?.packageId || '',
  quotationId: b.quotation?.quotationId || '',
  itineraryId: b.itinerary?.itineraryId || '',
  numberOfPeople: b.numberOfPeople ?? '',
  totalAmount: b.totalAmount ?? '',
  bookingStatus: b.bookingStatus || 'Confirmed',
  travelStartDate: b.travelStartDate || '',
  travelEndDate: b.travelEndDate || '',
  notes: b.notes || '',
  driverId: b.driver?.driverId || '',
  vehicleId: b.vehicle?.vehicleId || '',
  initialLocation: b.initialLocation || '',
  returnDropOffLocation: b.returnDropOffLocation || ''
});

const Bookings = () => {
  const [view, setView] = useState('list');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [itineraries, setItineraries] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  // Fixes 8.1 / 8.2.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState(EMPTY_BOOKING_FORM);

  const fetchData = async () => {
    try {
      const custRes = await fetch(`${API_BASE}/api/customers`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (custRes.ok) setCustomers(await custRes.json());

      const pkgRes = await fetch(`${API_BASE}/api/packages`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (pkgRes.ok) setPackages(await pkgRes.json());

      const qRes = await fetch(`${API_BASE}/api/quotations`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (qRes.ok) setQuotations(await qRes.json());

      const itinRes = await fetch(`${API_BASE}/api/itineraries`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (itinRes.ok) setItineraries(await itinRes.json());
      const drvRes = await fetch(`${API_BASE}/api/drivers`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (drvRes.ok) setDrivers(await drvRes.json());
      const vehRes = await fetch(`${API_BASE}/api/vehicles`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (vehRes.ok) setVehicles(await vehRes.json());

      const res = await fetch(`${API_BASE}/api/bookings`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data.map(b => ({
          ...b,
          id: `BK-${String(b.bookingId).padStart(3, '0')}`,
          customerDisplay: b.customer ? `${b.customer.firstName} ${b.customer.lastName}` : 'Unknown',
          packageDisplay: b.tourPackage?.packageName || 'Custom Package',
          travelDate: b.travelStartDate ? new Date(b.travelStartDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A',
          travellers: b.numberOfPeople || 0,
          totalDisplay: `USD ${b.totalAmount || 0}`,
          status: b.bookingStatus || 'Confirmed'
        })) : []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Booking ID', accessor: 'id' },
    { header: 'Customer', accessor: 'customerDisplay' },
    { header: 'Tour Package', accessor: 'packageDisplay' },
    { header: 'Travel Date', accessor: 'travelDate' },
    { header: 'Travellers', accessor: 'travellers' },
    { header: 'Total Amount', accessor: 'totalDisplay' },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  const handleSave = async () => {
    if (!formData.customerId || !formData.packageId) {
      alert("Customer and Tour Package are required.");
      return;
    }
    // Validation the form never had (fixes 7.1, 7.3, 7.7, 7.11).
    if (formData.travelStartDate || formData.travelEndDate) {
      const dateError = checkTravelDates(formData.travelStartDate, formData.travelEndDate, { mustBeFuture: false });
      if (dateError) { alert(dateError); return; }
    }
    const people = parseInt(formData.numberOfPeople);
    if (!people || people < 1) {
      alert('Number of travellers must be at least 1.');
      return;
    }
    if (parseFloat(formData.totalAmount) < 0) {
      alert('Total amount cannot be negative.');
      return;
    }
    if (formData.vehicleId) {
      const vehicle = vehicles.find(v => String(v.vehicleId) === String(formData.vehicleId));
      if (vehicle?.capacity && people > vehicle.capacity) {
        alert(`${vehicle.model} (${vehicle.registrationNo}) seats ${vehicle.capacity} and cannot carry ${people} passengers.`);
        return;
      }
    }
    try {
      const isEdit = view === 'edit';
      const url = isEdit ? `${API_BASE}/api/bookings/${formData.bookingId}` : `${API_BASE}/api/bookings`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        customer: { customerId: parseInt(formData.customerId) },
        tourPackage: { packageId: formData.packageId },
        quotation: formData.quotationId ? { quotationId: parseInt(formData.quotationId) } : null,
        itinerary: formData.itineraryId ? { itineraryId: parseInt(formData.itineraryId) } : null,
        numberOfPeople: parseInt(formData.numberOfPeople) || 0,
        totalAmount: parseFloat(formData.totalAmount) || 0,
        bookingStatus: formData.bookingStatus,
        travelStartDate: formData.travelStartDate || null,
        travelEndDate: formData.travelEndDate || null,
        notes: formData.notes,
        driver: formData.driverId ? { driverId: parseInt(formData.driverId) } : null,
        vehicle: formData.vehicleId ? { vehicleId: parseInt(formData.vehicleId) } : null,
        initialLocation: formData.initialLocation,
        returnDropOffLocation: formData.returnDropOffLocation
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Booking saved!');
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Failed to save booking');
      }
    } catch(e) { alert(e); }
  };

  const handleDelete = async (row) => {
    if(window.confirm('Are you sure you want to delete this booking?')) {
      try {
        const res = await fetch(`${API_BASE}/api/bookings/${row.bookingId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
           alert('Deleted!');
           fetchData();
        } else {
           alert(await res.text() || 'Could not delete booking');
        }
      } catch(e) { alert(e); }
    }
  };

  const renderList = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} className="bg-[#e5e7eb] font-semibold text-gray-700 border-none rounded px-4 py-2 text-sm w-64 focus:outline-none" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-600 focus:outline-none w-48">
            <option value="">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <button onClick={() => {
          setFormData(EMPTY_BOOKING_FORM);
          setView('add');
        }} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">
          + Add Booking
        </button>
      </div>
      
      <GenericTable 
        columns={columns} 
        data={applyFilters(bookings, {
          query: search,
          fields: ['id', 'customerDisplay', 'packageDisplay', 'travelDate', 'totalDisplay'],
          status: statusFilter,
          statusField: 'status'
        })} 
        onView={(row) => { 
          setSelectedBooking(row); 
          setView('view'); 
        }} 
        onEdit={(row) => {
          setSelectedBooking(row);
          setFormData(toFormData(row));
          setView('edit');
        }}
        onDelete={handleDelete}
      />
    </div>
  );

  const renderForm = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">{view === 'add' ? 'Add Booking' : 'Edit Booking'}</h2>
        <p className="text-gray-500 mb-6">Create a new customer tour booking and booking details.</p>
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
              <select value={formData.customerId} onChange={e => setFormData({...formData, customerId: e.target.value})} disabled={view === 'edit'} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-100">
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c.customerId} value={c.customerId}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quotation</label>
              <select value={formData.quotationId} onChange={e => setFormData({...formData, quotationId: e.target.value})} disabled={view === 'edit'} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-100">
                <option value="">Select Quotation (Optional)</option>
                {/* Fix 4.18: this listed every quotation in the system, so a
                    booking could be attached to another customer's quotation. */}
                {quotations
                  .filter(q => !formData.customerId
                    || String(q.inquiry?.customer?.customerId) === String(formData.customerId))
                  .map(q => (
                  <option key={q.quotationId} value={q.quotationId}>QT-{String(q.quotationId).padStart(3, '0')} (USD {q.totalAmount})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tour Package *</label>
              <select value={formData.packageId} onChange={e => setFormData({...formData, packageId: e.target.value})} disabled={view === 'edit'} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-gray-100">
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

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Travel Start Date</label>
              <input type="date" value={formData.travelStartDate} onChange={e => setFormData({...formData, travelStartDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Travel End Date</label>
              <input type="date" min={formData.travelStartDate || undefined} value={formData.travelEndDate} onChange={e => setFormData({...formData, travelEndDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Travellers</label>
              <input type="number" min="1" value={formData.numberOfPeople} onChange={e => setFormData({...formData, numberOfPeople: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">USD</span>
                <input type="number" min="0" step="0.01" value={formData.totalAmount} onChange={e => setFormData({...formData, totalAmount: e.target.value})} className="w-full border border-gray-300 rounded pl-12 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
          </div>


          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Trip Assignment <span className="text-xs bg-orange-100 text-orange-600 px-1 py-0.5 rounded ml-1 font-semibold">New</span></h3>
            <div className="grid grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assigned Driver</label>
                <select value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Unassigned</option>
                  {drivers.map(d => (
                    <option key={d.driverId} value={d.driverId}>{d.driverName} (DRV-{String(d.driverId).padStart(3, '0')})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assigned Vehicle</label>
                <select value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Unassigned</option>
                  {vehicles.map(v => (
                    <option key={v.vehicleId} value={v.vehicleId}>{v.model}, {v.registrationNo} ({v.capacity} seats)</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Initial Location</label>
                <input type="text" value={formData.initialLocation} onChange={e => setFormData({...formData, initialLocation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. Bandaranaike International Airport" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Return Drop-off Location</label>
                <input type="text" value={formData.returnDropOffLocation} onChange={e => setFormData({...formData, returnDropOffLocation: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. Colombo City Hotel" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Booking Status</label>
              {/* Fix 4.20: 'Ongoing' is filtered on by the admin dashboard,
                  the driver dashboard and the Ongoing Tours tab, but nothing
                  could set it, so those counts were always zero. */}
              <select value={formData.bookingStatus} onChange={e => setFormData({...formData, bookingStatus: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Special requirements or flight details..."></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">{view === 'edit' ? 'Update Booking' : 'Save Booking'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderView = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Booking Details</h2>
        <p className="text-gray-500 mb-6">Review complete booking and travel information.</p>
        
        <div className="flex justify-between items-center mb-6 p-4 border border-gray-200 rounded bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-500">Booking ID</p>
            <p className="font-semibold">{selectedBooking?.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Customer</p>
            <p className="font-semibold">{selectedBooking?.customerDisplay}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Amount</p>
            <p className="font-bold text-orange-600">{selectedBooking?.totalDisplay}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <span className={`px-2 py-1 rounded text-xs text-white ${selectedBooking?.bookingStatus === 'Confirmed' ? 'bg-green-600' : (selectedBooking?.bookingStatus === 'Cancelled' ? 'bg-red-600' : (selectedBooking?.bookingStatus === 'Completed' ? 'bg-blue-600' : 'bg-[#f97316]'))}`}>{selectedBooking?.bookingStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 max-w-md">
          <div className="text-sm font-medium text-gray-500">Tour Package</div>
          <div className="text-sm font-medium">{selectedBooking?.packageDisplay}</div>
          
          <div className="text-sm font-medium text-gray-500">Itinerary</div>
          <div className="text-sm font-medium">{selectedBooking?.itinerary?.itineraryName || 'N/A'}</div>
          
          <div className="text-sm font-medium text-gray-500">Quotation ID</div>
          <div className="text-sm font-medium">{selectedBooking?.quotation?.quotationId ? `QT-${String(selectedBooking.quotation.quotationId).padStart(3, '0')}` : 'N/A'}</div>

          <div className="text-sm font-medium text-gray-500">Travellers</div>
          <div className="text-sm font-medium">{selectedBooking?.travellers}</div>
          
          <div className="text-sm font-medium text-gray-500">Travel Dates</div>
          <div className="text-sm font-medium">{selectedBooking?.travelDate} - {selectedBooking?.travelEndDate ? new Date(selectedBooking.travelEndDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</div>
          
          <div className="col-span-2 text-sm font-medium text-gray-500 mt-2">Notes</div>
          <div className="col-span-2 text-sm font-medium bg-gray-50 p-3 rounded border border-gray-100">{selectedBooking?.notes || 'No notes provided.'}</div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
          <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Back</button>
          {/* Fix 6.1: this used to rebuild formData without driverId,
              vehicleId, initialLocation or returnDropOffLocation, so saving
              from the View screen wiped the assigned driver, vehicle and both
              locations. It now uses the same mapper as the list's Edit button. */}
          <button type="button" onClick={() => {
            setFormData(toFormData(selectedBooking));
            setView('edit');
          }} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Edit Booking</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <Topbar title="Booking Management" subtitle="Manage confirmed tours, dates, and customer details." />
      {view === 'list' && renderList()}
      {(view === 'add' || view === 'edit') && renderForm()}
      {view === 'view' && renderView()}
    </div>
  );
};

export default Bookings;
