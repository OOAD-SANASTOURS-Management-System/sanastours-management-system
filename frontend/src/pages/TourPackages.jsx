import React, { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import GenericTable from '../components/GenericTable';
import { applyFilters } from '../utils/filters';
import { API_BASE } from '../api';
// The Itineraries tab is gone: an itinerary belongs to exactly one tour
// package, so it is read and edited here, inside that package.
import { ItineraryDayList, fetchItinerary } from '../components/ItineraryModal';

const BLANK_DAY = { title: '', location: '', activities: '' };

const TourPackages = () => {
  const [view, setView] = useState('list');
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [packages, setPackages] = useState([]);
  // Fixes 8.1 / 8.2.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // The itinerary of the package currently being viewed or edited.
  const [itinerary, setItinerary] = useState(null);
  const [itineraryLoading, setItineraryLoading] = useState(false);
  const [itineraryForm, setItineraryForm] = useState({
    itineraryId: null,
    itineraryName: '',
    durationDays: '',
    itineraryStatus: 'Active',
    days: [{ ...BLANK_DAY }]
  });

  const [formData, setFormData] = useState({
    packageId: '',
    packageName: '',
    durationDays: '',
    price: '',
    description: '',
    packageStatus: 'Active'
  });

  const fetchData = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/packages`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }});
      if (res.ok) {
        const data = await res.json();
        setPackages(Array.isArray(data) ? data.map(pkg => ({
          ...pkg,
          id: pkg.packageId,
          name: pkg.packageName,
          duration: `${pkg.durationDays} Days / ${Math.max(1, pkg.durationDays - 1)} Nights`,
          // The 'Destination' column was hard-coded to 'Various Locations' for
          // every row: nothing links a package to destinations (there is no
          // destination endpoint). Show the price, which is real data.
          priceDisplay: `USD ${pkg.price ?? 0}`,
          status: pkg.packageStatus || 'Active'
        })) : []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { header: 'Package ID', accessor: 'id' },
    { header: 'Package Name', accessor: 'name' },
    { header: 'Duration', accessor: 'duration' },
    { header: 'Base Price', accessor: 'priceDisplay' },
    { header: 'Status', accessor: 'status', isStatus: true },
  ];

  const handleSave = async () => {
    // Fix 6.10 / 7.8: this form had no validation of any kind - an empty
    // Package ID was saved as a row with an empty primary key, and reusing an
    // existing ID silently overwrote that package.
    const isAdd = view !== 'edit';
    if (isAdd) {
      const id = (formData.packageId || '').trim();
      if (!id) {
        alert('Package ID is required.');
        return;
      }
      if (id.length > 10) {
        alert('Package ID can be at most 10 characters.');
        return;
      }
      if (packages.some(p => (p.packageId || '').toLowerCase() === id.toLowerCase())) {
        alert(`A tour package with ID ${id} already exists. Use a different ID, or edit that package.`);
        return;
      }
    }
    if (!formData.packageName?.trim()) {
      alert('Package name is required.');
      return;
    }
    if (!formData.description?.trim()) {
      alert('Description is required.');
      return;
    }
    const duration = parseInt(formData.durationDays);
    if (!duration || duration < 1) {
      alert('Duration must be at least 1 day.');
      return;
    }
    const price = parseFloat(formData.price);
    if (!price || price <= 0) {
      alert('Base price must be greater than zero.');
      return;
    }
    try {
      const isEdit = view === 'edit';
      const url = isEdit ? `${API_BASE}/api/packages/${selectedPkg.packageId}` : `${API_BASE}/api/packages`;
      const method = isEdit ? 'PUT' : 'POST';
      
      const payload = {
        packageId: formData.packageId,
        packageName: formData.packageName,
        durationDays: parseInt(formData.durationDays) || 1,
        price: parseFloat(formData.price) || 0,
        description: formData.description,
        packageStatus: formData.packageStatus,
        imageUrl: selectedPkg?.imageUrl || ''
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Tour Package saved!');
        setView('list');
        fetchData();
      } else {
        alert(await res.text() || 'Failed to save package');
      }
    } catch(e) { alert(e); }
  };

  /** Load the itinerary for a package and show it on the package's View screen. */
  const loadItinerary = async (packageId) => {
    setItineraryLoading(true);
    setItinerary(null);
    try {
      setItinerary(await fetchItinerary({ type: 'package', id: packageId }));
    } catch (e) {
      console.error(e);
    } finally {
      setItineraryLoading(false);
    }
  };

  const openPackage = async (row) => {
    setSelectedPkg(row);
    setView('view');
    await loadItinerary(row.packageId);
  };

  /** Open the day-by-day editor, for an existing itinerary or a brand new one. */
  const editItinerary = () => {
    const existing = itinerary?.found ? itinerary : null;
    setItineraryForm({
      itineraryId: existing?.itineraryId ?? null,
      itineraryName: existing?.itineraryName || `${selectedPkg?.packageName || 'Tour'} Itinerary`,
      // A new itinerary starts at the package's own duration, which is almost
      // always what it should be.
      durationDays: existing?.durationDays ?? selectedPkg?.durationDays ?? '',
      itineraryStatus: existing?.itineraryStatus || 'Active',
      days: existing?.days?.length ? existing.days.map(d => ({ ...d })) : [{ ...BLANK_DAY }]
    });
    setView('itinerary');
  };

  const addDay = () =>
    setItineraryForm(f => ({ ...f, days: [...f.days, { ...BLANK_DAY }] }));

  const updateDay = (index, field, value) =>
    // Map rather than copy-and-assign: a shallow copy would mutate the day
    // objects still held in `itinerary`, so the View screen would show unsaved
    // edits (the bug that was fixed on the old Itineraries page).
    setItineraryForm(f => ({
      ...f,
      days: f.days.map((day, i) => (i === index ? { ...day, [field]: value } : day))
    }));

  const removeDay = (index) => {
    if (itineraryForm.days.length === 1) {
      alert('An itinerary needs at least one day.');
      return;
    }
    setItineraryForm(f => ({ ...f, days: f.days.filter((_, i) => i !== index) }));
  };

  const saveItinerary = async () => {
    if (!itineraryForm.itineraryName?.trim()) {
      alert('Please give the itinerary a name.');
      return;
    }
    const duration = parseInt(itineraryForm.durationDays);
    if (!duration || duration < 1) {
      alert('Duration must be at least 1 day.');
      return;
    }
    if (itineraryForm.days.length !== duration) {
      alert(`This itinerary is set to ${duration} day(s) but has ${itineraryForm.days.length} day entries. Please make them match.`);
      return;
    }
    const incomplete = itineraryForm.days.findIndex(d => !d.title?.trim() || !d.location?.trim());
    if (incomplete !== -1) {
      alert(`Day ${incomplete + 1} needs both a title and a location.`);
      return;
    }

    const isEdit = Boolean(itineraryForm.itineraryId);
    const payload = {
      // The package is whichever one we are inside, never a free choice.
      packageId: selectedPkg.packageId,
      itineraryName: itineraryForm.itineraryName.trim(),
      durationDays: duration,
      itineraryStatus: itineraryForm.itineraryStatus,
      days: itineraryForm.days.map((d, i) => ({
        dayNumber: i + 1,
        title: d.title || '',
        location: d.location || '',
        activities: d.activities || ''
      }))
    };

    try {
      const res = await fetch(
        isEdit ? `${API_BASE}/api/itineraries/${itineraryForm.itineraryId}` : `${API_BASE}/api/itineraries`,
        {
          method: isEdit ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: JSON.stringify(payload)
        }
      );
      if (res.ok) {
        alert('Itinerary saved!');
        setView('view');
        await loadItinerary(selectedPkg.packageId);
      } else {
        alert(await res.text() || 'Failed to save itinerary');
      }
    } catch (e) { alert(e); }
  };

  const handleDelete = async (row) => {
    if(window.confirm('Are you sure you want to delete this tour package?')) {
      try {
        const res = await fetch(`${API_BASE}/api/packages/${row.packageId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        if(res.ok) {
           alert('Deleted!');
           fetchData();
        } else {
           alert(await res.text() || 'Could not delete package');
        }
      } catch(e) { alert(e); }
    }
  };

  const renderList = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4">
          <input type="text" placeholder="Search tour packages..." value={search} onChange={e => setSearch(e.target.value)} className="bg-[#e5e7eb] border-none rounded px-4 py-2 text-sm w-64 focus:outline-none" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded px-4 py-2 text-sm text-gray-700 bg-white focus:outline-none">
            <option value="">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
        <button onClick={() => { 
          setFormData({
            packageId: '',
            packageName: '',
            durationDays: '',
            price: '',
            description: '',
            packageStatus: 'Active'
          }); 
          setView('add'); 
        }} className="bg-[#f97316] text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600">
          + Add Tour Package
        </button>
      </div>
      
      <GenericTable 
        columns={columns} 
        data={applyFilters(packages, {
          query: search,
          fields: ['id', 'name', 'duration', 'description'],
          status: statusFilter,
          statusField: 'status'
        })} 
        onView={openPackage}
        onEdit={(row) => {
          setSelectedPkg(row);
          setFormData({
            packageId: row.packageId || '',
            packageName: row.packageName || '',
            durationDays: row.durationDays || '',
            price: row.price || '',
            description: row.description || '',
            packageStatus: row.packageStatus || 'Active'
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
        <h2 className="text-xl font-bold mb-2">{view === 'add' ? 'Add Tour Package' : 'Edit Tour Package'}</h2>
        <p className="text-gray-500 mb-6">Create a new tour package and destination information.</p>
        <form className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package ID *</label>
              <input type="text" value={formData.packageId} onChange={e => setFormData({...formData, packageId: e.target.value})} disabled={view === 'edit'} className="w-full border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100" placeholder="e.g. TP-005" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Name *</label>
              <input type="text" value={formData.packageName} onChange={e => setFormData({...formData, packageName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days) *</label>
              <input type="number" min="1" value={formData.durationDays} onChange={e => setFormData({...formData, durationDays: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (USD)</label>
              <input type="number" min="0" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
              <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-1 focus:ring-orange-500"></textarea>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Package Status</label>
              <select value={formData.packageStatus} onChange={e => setFormData({...formData, packageStatus: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleSave} className="px-4 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Save Tour Package</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderView = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">Tour Package Details</h2>
        <p className="text-gray-500 mb-6">View tour package information and pricing.</p>
        <div className="grid grid-cols-2 gap-y-4 max-w-md">
          <div className="text-sm font-medium text-gray-500">Package ID</div>
          <div className="text-sm font-medium">{selectedPkg?.id}</div>
          
          <div className="text-sm font-medium text-gray-500">Package Name</div>
          <div className="text-sm font-medium">{selectedPkg?.name}</div>
          
          <div className="text-sm font-medium text-gray-500">Duration</div>
          <div className="text-sm font-medium">{selectedPkg?.duration}</div>
          
          <div className="text-sm font-medium text-gray-500">Base Price</div>
          <div className="text-sm font-medium">USD {selectedPkg?.price || 0}</div>
          
          <div className="col-span-2 text-sm font-medium text-gray-500 mt-2">Description</div>
          <div className="col-span-2 text-sm font-medium">{selectedPkg?.description}</div>
          
          <div className="text-sm font-medium text-gray-500 mt-4">Status</div>
          <div className="text-sm font-medium mt-4"><span className={`px-2 py-1 rounded text-xs text-white ${selectedPkg?.status === 'Active' ? 'bg-green-600' : 'bg-gray-600'}`}>{selectedPkg?.status}</span></div>
        </div>

        {/* The itinerary for this package, in place of the old separate tab. */}
        <div className="mt-8 pt-6 border-t">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold">Itinerary</h3>
              <p className="text-sm text-gray-500">
                {itinerary?.found
                  ? `${itinerary.itineraryName} - ${itinerary.durationDays} day(s)`
                  : 'The day-by-day plan customers see for this package.'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {itinerary?.found && (
                <span className={`px-2 py-1 rounded text-xs text-white ${itinerary.itineraryStatus === 'Active' ? 'bg-green-600' : 'bg-[#f97316]'}`}>
                  {itinerary.itineraryStatus}
                </span>
              )}
              <button
                type="button"
                onClick={editItinerary}
                className="px-4 py-2 border border-[#f97316] text-[#f97316] rounded text-sm font-medium hover:bg-orange-50"
              >
                {itinerary?.found ? 'Edit Itinerary' : 'Add Itinerary'}
              </button>
            </div>
          </div>

          {itineraryLoading ? (
            <p className="text-gray-500 text-sm">Loading itinerary...</p>
          ) : itinerary?.found ? (
            <ItineraryDayList days={itinerary.days} />
          ) : (
            <p className="text-gray-500 text-sm">No itinerary has been added to this package yet.</p>
          )}
        </div>

        <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
          <button type="button" onClick={() => setView('list')} className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Back</button>
          <button type="button" onClick={() => {
            setFormData({
              packageId: selectedPkg?.packageId || '',
              packageName: selectedPkg?.packageName || '',
              durationDays: selectedPkg?.durationDays || '',
              price: selectedPkg?.price || '',
              description: selectedPkg?.description || '',
              packageStatus: selectedPkg?.packageStatus || 'Active'
            });
            setView('edit');
          }} className="px-4 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Edit Tour Package</button>
        </div>
      </div>
    </div>
  );

  const renderItineraryForm = () => (
    <div className="p-8">
      <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-2">
          {itineraryForm.itineraryId ? 'Edit Itinerary' : 'Add Itinerary'}
        </h2>
        <p className="text-gray-500 mb-6">
          Day-by-day plan for {selectedPkg?.packageName} ({selectedPkg?.packageId}).
        </p>
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Itinerary Name *</label>
              <input
                type="text"
                value={itineraryForm.itineraryName}
                onChange={e => setItineraryForm({ ...itineraryForm, itineraryName: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Days) *</label>
              <input
                type="number"
                min="1"
                value={itineraryForm.durationDays}
                onChange={e => setItineraryForm({ ...itineraryForm, durationDays: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              {itineraryForm.durationDays && itineraryForm.days.length !== parseInt(itineraryForm.durationDays) && (
                <p className="text-xs text-red-600 mt-1">
                  {itineraryForm.days.length} day entr{itineraryForm.days.length === 1 ? 'y' : 'ies'} below, but the duration says {itineraryForm.durationDays}.
                </p>
              )}
            </div>
          </div>

          {itineraryForm.days.map((day, index) => (
            <div key={index} className="border border-gray-200 rounded p-4 bg-gray-50 relative">
              <button type="button" onClick={() => removeDay(index)} className="absolute top-4 right-4 text-red-500 hover:text-red-700 text-sm font-medium">Remove</button>
              <h3 className="font-bold mb-4">Day {index + 1}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" value={day.title || ''} onChange={e => updateDay(index, 'title', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input type="text" value={day.location || ''} onChange={e => updateDay(index, 'location', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Activities / Plan</label>
                  <textarea value={day.activities || ''} onChange={e => updateDay(index, 'activities', e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"></textarea>
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-center">
            <button type="button" onClick={addDay} className="text-[#f97316] font-medium px-4 py-2 border border-[#f97316] rounded hover:bg-orange-50">
              + Add Another Day
            </button>
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Itinerary Status</label>
            <select
              value={itineraryForm.itineraryStatus}
              onChange={e => setItineraryForm({ ...itineraryForm, itineraryStatus: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="Draft">Draft</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-4 border-t">
            <button type="button" onClick={() => setView('view')} className="px-4 py-2 border border-gray-300 rounded font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={saveItinerary} className="px-4 py-2 bg-[#f97316] text-white rounded font-medium hover:bg-orange-600">Save Itinerary</button>
          </div>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex-1 bg-white flex flex-col min-h-screen">
      <Topbar title="Tour Package Management" subtitle="Manage available tour packages and their itineraries." />
      {view === 'list' && renderList()}
      {(view === 'add' || view === 'edit') && renderForm()}
      {view === 'view' && renderView()}
      {view === 'itinerary' && renderItineraryForm()}
    </div>
  );
};

export default TourPackages;
