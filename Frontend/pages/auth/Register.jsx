import React, { useState } from 'react';
import { API_BASE } from '../../api';

const COUNTRIES = [
  "Australia", "Canada", "China", "France", "Germany", "India", 
  "Italy", "Japan", "New Zealand", "Russia", "South Africa", 
  "Sri Lanka", "United Arab Emirates", "United Kingdom", "United States"
];

export default function Register({ setView }) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    address: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      const payload = {
        username: formData.email, // using email as username
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
        country: formData.country
      };

      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setView('login'), 3000);
      } else {
        const text = await res.text();
        setError(text || 'Registration failed');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-100 w-[600px] text-center">
          <span className="material-icons text-green-500 text-6xl mb-4">check_circle</span>
          <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
          <p className="text-gray-500">Your account has been created. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <div className="w-1/3 bg-[#1a1a1a] text-white p-12 flex flex-col justify-between">
        <h1 className="text-3xl font-bold">SANAS <span className="text-[#f97316]">TOURS</span></h1>
        <div>
          <h2 className="text-3xl font-bold mb-4">Your Sri Lanka tour,<br/>from first inquiry to final<br/>payment.</h2>
          <ul className="text-gray-400 space-y-2">
            <li>Send an inquiry and get a quotation</li>
            <li>Review the itinerary day by day</li>
            <li>Confirm your booking and track payments</li>
          </ul>
        </div>
      </div>
      <div className="w-2/3 flex items-center justify-center py-10">
        <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-100 w-[600px]">
          <h2 className="text-2xl font-bold mb-2">Create your account</h2>
          <p className="text-gray-500 mb-6 text-sm">Tell us a little about yourself to get started.</p>
          
          {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded text-sm">{error}</div>}
          
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="First Name" required />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Last Name" required />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Phone number" required />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Email address" required />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                <select name="country" value={formData.country} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white" required>
                  <option value="">Select Country</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input type="text" name="address" value={formData.address} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Enter address" />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Create a password" required />
              </div>
              <div className="w-1/2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Re-enter password" required />
              </div>
            </div>
            <div className="pt-2">
              <label className="flex items-center text-sm text-gray-600">
                <input type="checkbox" className="mr-2" required /> I agree to the terms and privacy policy
              </label>
            </div>
            <button type="submit" className="w-32 bg-[#f97316] hover:bg-orange-600 text-white font-medium py-2 rounded text-sm">Create Account</button>
          </form>
          <p className="text-center mt-6 text-sm text-gray-600">Already have an account? <button type="button" onClick={() => setView('login')} className="text-[#f97316] font-medium">Sign in</button></p>
        </div>
      </div>
    </div>
  );
}
