import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import GenericTable from '../components/GenericTable';

const Drivers = () => {
  const [view, setView] = useState('list'); 
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [drivers, setDrivers] = useState([]);

  const [formData, setFormData] = useState({
    driverId: null,
    driverName: '',
    nic: '',
    phone: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    experienceYears: '',
    driverStatus: 'Available',
    notes: '',
    // User fields (only used for Add)
    username: '',
    email: '',
    password: ''
  });

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:8081/api/drivers', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.ok) {
        const data = await res.json();
        setDrivers(Array.isArray(data) ? data.map(d => ({
          ...d,
          id: `DRV-${String(d.driverId).padStart(3, '0')}`,
          experienceDisplay: d.experienceYears ? `${d.experienceYears} Years` : 'N/A',
          status: d.driverStatus || 'Available'
        })) : []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Driver ID', accessor: 'id' },
    { header: 'Driver Name', accessor: 'driverName' },
    { header: 'Licence No.', accessor: 'licenseNumber' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Experience', accessor: 'experienceDisplay' },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  const handleSave = async () => {
    if (!formData.driverName || !formData.licenseNumber) {
      alert("Driver Name and License Number are required.");
      return;
    }
    const isEdit = view === 'edit';
    if (!isEdit && (!formData.username || !formData.password)) {
      alert("Username and Password are required to create a new driver account.");
      return;
    }

    try {
      const url = isEdit ? `http://localhost:8081/api/drivers/${formData.driverId}` : `http://localhost:8081/api/drivers`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        driverName: formData.driverName,
        nic: formData.nic,
        phone: formData.phone,
        licenseNumber: formData.licenseNumber,
        licenseExpiryDate: formData.licenseExpiryDate || null,
        experienceYears: parseInt(formData.experienceYears) || 0,
        driverStatus: formData.driverStatus,
        notes: formData.notes,
        ...(isEdit ? {} : { username: formData.username, email: formData.email, password: formData.password })
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert('Driver saved!');
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Failed to save driver');
      }
    } catch(e) { alert(e); }
  };

  const handleDelete = async (row) => {
    if(window.confirm('Are you sure you want to delete this driver?')) {
      try {
        const res = await fetch(`http://localhost:8081/api/drivers/${row.driverId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
           alert('Deleted!');
           fetchData();
        } else {
           alert(await res.text() || 'Could not delete driver');
        }
      } catch(e) { alert(e); }
    }
  };

  const renderList = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search drivers..." className="bg-[#e5e7eb] font-semibold text-gray-700 border-none rounded px-4 py-2 text-sm w-64 focus:outline-none" />
          <select className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-600 focus:outline-none w-48">
            <option value="">Status</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <button onClick={() => { 
          setFormData({
            driverId: null,
            driverName: '',
            nic: '',
            phone: '',
            licenseNumber: '',
            licenseExpiryDate: '',
            experienceYears: '',
            driverStatus: 'Available',
            notes: '',
            username: '',
            email: '',
            password: ''
          }); 
          setView('add'); 
        }} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">
          + Add Driver
        </button>
      </div>
      
      <GenericTable 
        columns={columns} 
        data={drivers} 
        onView={(row) => { 
          setSelectedDriver(row); 
          setView('view'); 
        }} 
        onEdit={(row) => {
          setSelectedDriver(row);
          setFormData({
            driverId: row.driverId,
            driverName: row.driverName || '',
            nic: row.nic || '',
            phone: row.phone || '',
            licenseNumber: row.licenseNumber || '',
            licenseExpiryDate: row.licenseExpiryDate || '',
            experienceYears: row.experienceYears || '',
            driverStatus: row.driverStatus || 'Available',
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
        <h2 className="text-xl font-bold mb-2">{view === 'add' ? 'Add Driver' : 'Edit Driver'}</h2>
        <p className="text-gray-500 mb-6">Manage driver information, licence details, and availability.</p>
        <form className="space-y-6">
          
          {view === 'add' && (
            <div className="bg-gray-50 p-4 rounded border border-gray-200 mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Driver Account Creation</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password *</label>
                  <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address (Optional)</label>
                  <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIC Number</label>
              <input type="text" value={formData.nic} onChange={e => setFormData({...formData, nic: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
              <input type="number" value={formData.experienceYears} onChange={e => setFormData({...formData, experienceYears: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Licence Number *</label>
              <input type="text" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Licence Expiry Date</label>
              <input type="date" value={formData.licenseExpiryDate} onChange={e => setFormData({...formData, licenseExpiryDate: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver Status</label>
              <select value={formData.driverStatus} onChange={e => setFormData({...formData, driverStatus: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Special skills, languages spoken, etc."></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">{view === 'edit' ? 'Update Driver' : 'Save Driver'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderView = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Driver Details</h2>
        <p className="text-gray-500 mb-6">Review driver information, licence details, and current status.</p>
        
        <div className="flex justify-between items-center mb-6 p-4 border border-gray-200 rounded bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-500">Driver ID</p>
            <p className="font-semibold">{selectedDriver?.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Driver Name</p>
            <p className="font-semibold text-gray-900">{selectedDriver?.driverName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Experience</p>
            <p className="font-bold text-gray-900">{selectedDriver?.experienceDisplay}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <span className={`px-2 py-1 rounded text-xs text-white ${selectedDriver?.driverStatus === 'Available' ? 'bg-green-600' : (selectedDriver?.driverStatus === 'Inactive' ? 'bg-gray-500' : 'bg-[#f97316]')}`}>{selectedDriver?.driverStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 max-w-md">
          <div className="text-sm font-medium text-gray-500">Licence Number</div>
          <div className="text-sm font-medium">{selectedDriver?.licenseNumber}</div>
          
          <div className="text-sm font-medium text-gray-500">Licence Expiry</div>
          <div className="text-sm font-medium">{selectedDriver?.licenseExpiryDate ? new Date(selectedDriver.licenseExpiryDate).toLocaleDateString('en-GB') : 'N/A'}</div>

          <div className="text-sm font-medium text-gray-500">Phone Number</div>
          <div className="text-sm font-medium">{selectedDriver?.phone || 'N/A'}</div>

          <div className="text-sm font-medium text-gray-500">NIC</div>
          <div className="text-sm font-medium">{selectedDriver?.nic || 'N/A'}</div>
          
          <div className="col-span-2 text-sm font-medium text-gray-500 mt-2">Notes</div>
          <div className="col-span-2 text-sm font-medium bg-gray-50 p-3 rounded border border-gray-100">{selectedDriver?.notes || 'No notes provided.'}</div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
          <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Back</button>
          <button type="button" onClick={() => {
            setFormData({
              driverId: selectedDriver.driverId,
              driverName: selectedDriver.driverName || '',
              nic: selectedDriver.nic || '',
              phone: selectedDriver.phone || '',
              licenseNumber: selectedDriver.licenseNumber || '',
              licenseExpiryDate: selectedDriver.licenseExpiryDate || '',
              experienceYears: selectedDriver.experienceYears || '',
              driverStatus: selectedDriver.driverStatus || 'Available',
              notes: selectedDriver.notes || ''
            });
            setView('edit');
          }} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Edit Driver</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <Topbar title="Driver Management" subtitle="Manage driver information, licence details, and availability for tour assignments." />
      {view === 'list' && renderList()}
      {(view === 'add' || view === 'edit') && renderForm()}
      {view === 'view' && renderView()}
    </div>
  );
};

export default Drivers;
