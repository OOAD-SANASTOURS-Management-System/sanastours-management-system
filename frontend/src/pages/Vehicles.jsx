import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import GenericTable from '../components/GenericTable';

const Vehicles = () => {
  const [view, setView] = useState('list'); 
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  const [formData, setFormData] = useState({
    vehicleId: null,
    registrationNo: '',
    vehicleType: 'Car',
    model: '',
    capacity: '',
    vehicleStatus: 'Available',
    notes: ''
  });

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:8081/api/vehicles', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.ok) {
        const data = await res.json();
        setVehicles(Array.isArray(data) ? data.map(v => ({
          ...v,
          id: `VEH-${String(v.vehicleId).padStart(3, '0')}`,
          type: v.vehicleType || 'Unknown',
          capacityDisplay: v.capacity || 0,
          status: v.vehicleStatus || 'Available'
        })) : []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Vehicle ID', accessor: 'id' },
    { header: 'Registration No.', accessor: 'registrationNo' },
    { header: 'Type', accessor: 'type' },
    { header: 'Capacity', accessor: 'capacityDisplay' },
    { header: 'Model', accessor: 'model' },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  const handleSave = async () => {
    if (!formData.registrationNo || !formData.model) {
      alert("Registration Number and Model are required.");
      return;
    }
    try {
      const isEdit = view === 'edit';
      const url = isEdit ? `http://localhost:8081/api/vehicles/${formData.vehicleId}` : `http://localhost:8081/api/vehicles`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        registrationNo: formData.registrationNo,
        vehicleType: formData.vehicleType,
        model: formData.model,
        capacity: parseInt(formData.capacity) || 0,
        vehicleStatus: formData.vehicleStatus,
        notes: formData.notes
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Vehicle saved!');
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Failed to save vehicle');
      }
    } catch(e) { alert(e); }
  };

  const handleDelete = async (row) => {
    if(window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        const res = await fetch(`http://localhost:8081/api/vehicles/${row.vehicleId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
           alert('Deleted!');
           fetchData();
        } else {
           alert(await res.text() || 'Could not delete vehicle');
        }
      } catch(e) { alert(e); }
    }
  };

  const renderList = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search vehicles..." className="bg-[#e5e7eb] font-semibold text-gray-700 border-none rounded px-4 py-2 text-sm w-64 focus:outline-none" />
          <select className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-600 focus:outline-none w-48">
            <option value="">Status</option>
            <option value="Available">Available</option>
            <option value="Assigned">Assigned</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <button onClick={() => { 
          setFormData({
            vehicleId: null,
            registrationNo: '',
            vehicleType: 'Car',
            model: '',
            capacity: '',
            vehicleStatus: 'Available',
            notes: ''
          }); 
          setView('add'); 
        }} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">
          + Add Vehicle
        </button>
      </div>
      
      <GenericTable 
        columns={columns} 
        data={vehicles} 
        onView={(row) => { 
          setSelectedVehicle(row); 
          setView('view'); 
        }} 
        onEdit={(row) => {
          setSelectedVehicle(row);
          setFormData({
            vehicleId: row.vehicleId,
            registrationNo: row.registrationNo || '',
            vehicleType: row.vehicleType || 'Car',
            model: row.model || '',
            capacity: row.capacity || '',
            vehicleStatus: row.vehicleStatus || 'Available',
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
        <h2 className="text-xl font-bold mb-2">{view === 'add' ? 'Add Vehicle' : 'Edit Vehicle'}</h2>
        <p className="text-gray-500 mb-6">Manage vehicle information, capacity, and availability for tour operations.</p>
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Registration No. *</label>
              <input type="text" value={formData.registrationNo} onChange={e => setFormData({...formData, registrationNo: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. PF-3293" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Model *</label>
              <input type="text" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="e.g. Toyota Hiace" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
              <select value={formData.vehicleType} onChange={e => setFormData({...formData, vehicleType: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="Car">Car</option>
                <option value="Van">Van</option>
                <option value="Bus">Bus</option>
                <option value="SUV">SUV</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (Passengers)</label>
              <input type="number" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Status</label>
              <select value={formData.vehicleStatus} onChange={e => setFormData({...formData, vehicleStatus: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="Available">Available</option>
                <option value="Assigned">Assigned</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Maintenance schedule, AC status, etc."></textarea>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">{view === 'edit' ? 'Update Vehicle' : 'Save Vehicle'}</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderView = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Vehicle Details</h2>
        <p className="text-gray-500 mb-6">Review vehicle information, capacity, and current status.</p>
        
        <div className="flex justify-between items-center mb-6 p-4 border border-gray-200 rounded bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-500">Vehicle ID</p>
            <p className="font-semibold">{selectedVehicle?.id}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Registration</p>
            <p className="font-semibold text-gray-900">{selectedVehicle?.registrationNo}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Capacity</p>
            <p className="font-bold text-gray-900">{selectedVehicle?.capacityDisplay} Passengers</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Status</p>
            <span className={`px-2 py-1 rounded text-xs text-white ${selectedVehicle?.vehicleStatus === 'Available' ? 'bg-green-600' : (selectedVehicle?.vehicleStatus === 'Maintenance' || selectedVehicle?.vehicleStatus === 'Inactive' ? 'bg-red-600' : 'bg-[#f97316]')}`}>{selectedVehicle?.vehicleStatus}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-4 max-w-md">
          <div className="text-sm font-medium text-gray-500">Vehicle Model</div>
          <div className="text-sm font-medium">{selectedVehicle?.model}</div>
          
          <div className="text-sm font-medium text-gray-500">Vehicle Type</div>
          <div className="text-sm font-medium">{selectedVehicle?.type}</div>
          
          <div className="col-span-2 text-sm font-medium text-gray-500 mt-2">Notes</div>
          <div className="col-span-2 text-sm font-medium bg-gray-50 p-3 rounded border border-gray-100">{selectedVehicle?.notes || 'No notes provided.'}</div>
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
          <button type="button" onClick={() => setView('list')} className="px-6 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Back</button>
          <button type="button" onClick={() => {
            setFormData({
              vehicleId: selectedVehicle.vehicleId,
              registrationNo: selectedVehicle.registrationNo || '',
              vehicleType: selectedVehicle.vehicleType || 'Car',
              model: selectedVehicle.model || '',
              capacity: selectedVehicle.capacity || '',
              vehicleStatus: selectedVehicle.vehicleStatus || 'Available',
              notes: selectedVehicle.notes || ''
            });
            setView('edit');
          }} className="px-6 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Edit Vehicle</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <Topbar title="Vehicle Management" subtitle="Manage vehicle information, capacity, and availability for tour operations." />
      {view === 'list' && renderList()}
      {(view === 'add' || view === 'edit') && renderForm()}
      {view === 'view' && renderView()}
    </div>
  );
};

export default Vehicles;
