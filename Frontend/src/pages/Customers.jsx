import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import GenericTable from '../components/GenericTable';
import { applyFilters } from '../utils/filters';
import { API_BASE } from '../api';

const Customers = () => {
  const [view, setView] = useState('list'); 
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customers, setCustomers] = useState([]);
  // Fixes 8.1 / 8.2: the search box and status dropdown now filter the list.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    address: '',
    accountStatus: 'Active'
  });

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/customers`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.ok) {
        const data = await res.json();
        setCustomers(Array.isArray(data) ? data.map(c => ({
          ...c,
          id: `CUST-${String(c.customerId).padStart(3, '0')}`,
          name: `${c.firstName} ${c.lastName}`,
          email: c.user?.email || 'Unknown',
          phone: c.phone || '',
          country: c.country || '',
          status: c.accountStatus || 'Active'
        })) : []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Customer ID', accessor: 'id' },
    { header: 'Name', accessor: 'name' },
    { header: 'Email', accessor: 'email' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Country', accessor: 'country' },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  const handleSave = async () => {
    // Validation the form never had: the server now rejects these too.
    if (!formData.firstName?.trim() || !formData.lastName?.trim()) {
      alert('First name and last name are required.');
      return;
    }
    if (view !== 'edit' && !formData.email?.trim()) {
      alert('An email address is required to create the customer login.');
      return;
    }
    try {
      const isEdit = view === 'edit';
      const url = isEdit ? `${API_BASE}/api/customers/${selectedCustomer.customerId}` : `${API_BASE}/api/customers`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        // Fix 3.7: a new customer gets a generated one-time password, which
        // the API returns once so it can be passed on.
        const saved = await res.json().catch(() => null);
        if (!isEdit && saved?.temporaryPassword) {
          alert(`Customer created.\n\nTemporary password for ${saved.email}: ${saved.temporaryPassword}\n\nShare it with them and ask them to change it after signing in.`);
        } else {
          alert('Customer saved!');
        }
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Failed to save customer');
      }
    } catch(e) { alert(e); }
  };

  const handleDelete = async (row) => {
    if(window.confirm('Are you sure you want to delete this customer?')) {
      try {
        const res = await fetch(`${API_BASE}/api/customers/${row.customerId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
           alert('Deleted!');
           fetchData();
        } else {
           alert('Could not delete customer');
        }
      } catch(e) { alert(e); }
    }
  };

    const renderList = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="bg-[#e5e7eb] border-none rounded px-4 py-2 text-sm w-64 focus:outline-none" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-700 bg-white focus:outline-none">
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
        <button onClick={() => { setFormData({firstName:'', lastName:'', email:'', phone:'', country:'', address:'', accountStatus:'Active'}); setView('add'); }} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">
          + Add Customer
        </button>
      </div>
      
      <GenericTable 
        columns={columns} 
        data={applyFilters(customers, {
          query: search,
          fields: ['id', 'name', 'email', 'phone', 'country'],
          status: statusFilter,
          statusField: 'status'
        })} 
        onView={(row) => { 
          setSelectedCustomer(row); 
          setView('view'); 
        }} 
        onEdit={(row) => {
          setSelectedCustomer(row);
          setFormData({
            firstName: row.firstName || '',
            lastName: row.lastName || '',
            email: row.user?.email || row.email || '',
            phone: row.phone || '',
            country: row.country || '',
            address: row.address || '',
            accountStatus: row.accountStatus || 'Active'
          });
          setView('edit');
        }}
        onDelete={handleDelete}
      />
    </div>
  );

  const renderForm = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-3xl">
        <h2 className="text-xl font-bold mb-2">{view === 'edit' ? 'Edit Customer' : 'Add New Customer'}</h2>
        <form className="space-y-4 mt-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
                        <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={view === 'edit'} className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Status</label>
              <select value={formData.accountStatus} onChange={e => setFormData({...formData, accountStatus: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2">
                <option>Active</option>
                <option>Suspended</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600">Save Customer</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderView = () => (
    <div className="p-8 flex gap-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 flex-1">
        <h2 className="text-xl font-bold mb-2">Customer Details</h2>
        <div className="grid grid-cols-2 gap-y-4 max-w-md mt-6">
          <div className="text-sm font-medium text-gray-500">Customer ID</div>
          <div className="text-sm font-medium">{selectedCustomer?.id}</div>
          <div className="text-sm font-medium text-gray-500">Name</div>
          <div className="text-sm font-medium">{selectedCustomer?.name}</div>
          <div className="text-sm font-medium text-gray-500">Email</div>
          <div className="text-sm font-medium">{selectedCustomer?.email}</div>
          <div className="text-sm font-medium text-gray-500">Phone</div>
          <div className="text-sm font-medium">{selectedCustomer?.phone}</div>
          <div className="text-sm font-medium text-gray-500">Country</div>
          <div className="text-sm font-medium">{selectedCustomer?.country}</div>
          <div className="text-sm font-medium text-gray-500">Status</div>
          {/* Fix 8.7: this badge was hard-coded green, so a Suspended
              customer still looked active. */}
          <div className="text-sm font-medium">
            <span className={`px-2 py-1 rounded text-xs text-white ${
              (selectedCustomer?.accountStatus || 'Active') === 'Active' ? 'bg-green-600' : 'bg-red-600'
            }`}>{selectedCustomer?.accountStatus || 'Active'}</span>
          </div>
        </div>
        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
          <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Back</button>
          <button type="button" onClick={() => {
            setFormData({
              firstName: selectedCustomer.firstName || '',
              lastName: selectedCustomer.lastName || '',
              email: selectedCustomer.user?.email || selectedCustomer.email || '',
              phone: selectedCustomer.phone || '',
              country: selectedCustomer.country || '',
              address: selectedCustomer.address || '',
              accountStatus: selectedCustomer.accountStatus || 'Active'
            });
            setView('edit');
          }} className="px-4 py-2 bg-orange-500 text-white rounded font-medium hover:bg-orange-600">Edit Customer</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <Topbar title="Customer Management" subtitle="Manage customer information and profiles." />
      {view === 'list' && renderList()}
      {(view === 'add' || view === 'edit') && renderForm()}
      {view === 'view' && renderView()}
    </div>
  );
};

export default Customers;
