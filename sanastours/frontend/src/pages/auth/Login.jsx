import React, { useState } from 'react';
import { API_BASE } from '../../api';

export default function Login({ setUser, setView }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
      } else {
        const text = await res.text();
        setError(text || 'Login failed');
      }
    } catch (err) {
      setError(err.message);
    }
  };

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
      <div className="w-2/3 flex items-center justify-center">
        <div className="bg-white p-10 rounded-lg shadow-sm border border-gray-100 w-[500px]">
          <h2 className="text-2xl font-bold mb-2">Sign in</h2>
          <p className="text-sm text-gray-500 mb-8">Access your tours, quotations and payments.</p>
          {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{error}</div>}
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Email or Username *</label>
              <input type="text" className="w-full border p-2 rounded" value={username} onChange={e => setUsername(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Password *</label>
              <input type="password" className="w-full border p-2 rounded" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {/* Fix 3.8: "Keep me signed in" was a checkbox wired to nothing
                (a session already lasts 24 hours), and "Forgot password?" was
                an href="#" with no reset flow behind it anywhere in the
                backend. Rather than leave two controls that do nothing, say
                what is true. */}
            <div className="flex justify-between items-center mb-6 text-sm">
              <span className="text-gray-500">Sessions last 24 hours.</span>
              <button
                type="button"
                onClick={() => setError('Password resets are not self-service yet - please contact the SANAS TOURS office and we will reset it for you.')}
                className="text-[#f97316] hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <button type="submit" className="w-full bg-[#f97316] text-white font-bold py-3 rounded">Sign In</button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-500">
            New to SANAS TOURS? <button onClick={() => setView('register')} className="text-[#f97316] font-bold hover:underline">Create an account</button>
          </div>
        </div>
      </div>
    </div>
  );
}
