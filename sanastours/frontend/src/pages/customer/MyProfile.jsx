import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../api';

export default function MyProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({});

  const fetchProfile = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      
      const res = await fetch(`${API_BASE}/api/customers/${user.roleId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        // Fix 6.4: the API returns `phone`, and the email lives on the
        // nested `user` object - `data.email` and `data.contactNumber` were
        // always undefined, so both fields rendered blank and the phone box
        // edited a field the backend ignores.
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.user?.email || '',
          phone: data.phone || '',
          country: data.country || '',
          address: data.address || ''
        });
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async () => {
    try {
      // Fix 6.5: this used to spread the whole profile, including the nested
      // `user` object and a numeric customerId, into a handler typed
      // Map<String, String> - Jackson cannot bind that, so every profile
      // update failed. Send only the editable fields, as strings.
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        country: formData.country,
        address: formData.address
      };
      const res = await fetch(`${API_BASE}/api/customers/${profile.customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Profile updated successfully!');
        setIsEditing(false);
        fetchProfile();
        // Force reload to update the name in the top right navbar since it's cached in the Layout state
        window.location.reload(); 
      } else {
        alert(await res.text());
      }
    } catch (e) { alert(e); }
  };

  if (!profile) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm p-8">
        <p className="text-gray-500 mb-8 text-sm">Update your personal information.</p>
        
        <form className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              {/* The email address is also the login username, which this
                  endpoint does not change, so it is shown read-only rather
                  than offering an edit that silently does nothing. */}
              <input type="email" value={formData.email} disabled readOnly className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-gray-100 text-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
            <button type="button" onClick={() => setIsEditing(false)} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Cancel</button>
            <button type="button" onClick={handleUpdate} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">Update Profile</button>
          </div>
        </form>
      </div>
    );
  }

  const initials = (profile.firstName?.[0] || '') + (profile.lastName?.[0] || '');

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg border border-gray-200 shadow-sm p-8">
      <p className="text-gray-500 mb-8 text-sm">View your personal information and account details.</p>
      
      <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
        <div className="w-16 h-16 rounded-full bg-[#f97316] text-white flex items-center justify-center text-2xl font-bold uppercase">
          {initials || 'C'}
        </div>
        <div>
          <h2 className="text-xl font-bold">{profile.firstName} {profile.lastName}</h2>
          <p className="text-sm text-gray-500">Customer ID: CUST-{profile.customerId}</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-3">
          <p className="text-sm font-medium text-gray-700">Full Name</p>
          <p className="text-sm col-span-2">{profile.firstName} {profile.lastName}</p>
        </div>
        <div className="grid grid-cols-3">
          <p className="text-sm font-medium text-gray-700">Email Address</p>
          <p className="text-sm col-span-2">{profile.user?.email || 'N/A'}</p>
        </div>
        <div className="grid grid-cols-3">
          <p className="text-sm font-medium text-gray-700">Phone Number</p>
          <p className="text-sm col-span-2">{profile.phone || 'N/A'}</p>
        </div>
        <div className="grid grid-cols-3">
          <p className="text-sm font-medium text-gray-700">Country</p>
          <p className="text-sm col-span-2">{profile.country}</p>
        </div>
        <div className="grid grid-cols-3">
          <p className="text-sm font-medium text-gray-700">Address</p>
          <p className="text-sm col-span-2">{profile.address || 'N/A'}</p>
        </div>
        <div className="grid grid-cols-3">
          <p className="text-sm font-medium text-gray-700">Account Status</p>
          <div className="col-span-2">
            {/* Was hard-coded to Active regardless of the real status. */}
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              (profile.accountStatus || 'Active') === 'Active'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>{profile.accountStatus || 'Active'}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-8 pt-4 border-t border-gray-100">
        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">
          Edit Profile
        </button>
      </div>
    </div>
  );
}
