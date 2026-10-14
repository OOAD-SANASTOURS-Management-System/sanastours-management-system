import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './Layout';
import CustomerLayout from './CustomerLayout';
import { installSessionGuard } from './api';

// Admin pages
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Inquiries from './pages/Inquiries';
import TourPackages from './pages/TourPackages';
import Quotations from './pages/Quotations';
import Bookings from './pages/Bookings';
import Payments from './pages/Payments';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Feedback from './pages/Feedback';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Customer pages
import CustomerDashboard from './pages/customer/CustomerDashboard';
import MyProfile from './pages/customer/MyProfile';
import CustomerTourPackages from './pages/customer/CustomerTourPackages';
import MyInquiries from './pages/customer/MyInquiries';
import MyQuotations from './pages/customer/MyQuotations';
import MyBookings from './pages/customer/MyBookings';
import MyPayments from './pages/customer/MyPayments';
import MyFeedback from './pages/customer/MyFeedback';

// Driver pages
import DriverLayout from './driver/DriverLayout';
import DriverDashboard from './driver/DriverDashboard';
import MyTours from './driver/MyTours';
import TourDetails from './driver/TourDetails';
import DriverProfile from './driver/DriverProfile';

function AppContent() {
  const [user, setUser] = useState(() => { try { const saved = localStorage.getItem('user'); return saved ? JSON.parse(saved) : null; } catch { return null; } });
  const [authView, setAuthView] = useState('login');
  
  const [currentAdminView, setCurrentAdminView] = useState('/');
  const [currentCustomerView, setCurrentCustomerView] = useState('/');
  // The booking a customer pressed "Pay Now" on, handed to My Payments.
  const [payForBooking, setPayForBooking] = useState(null);
  // The booking a customer pressed "Give Feedback" on, handed to My Feedback.
  const [feedbackForBooking, setFeedbackForBooking] = useState(null);
  const giveFeedback = (id) => { setFeedbackForBooking(id); setCurrentCustomerView('/my-feedback'); };

  // Fix 3.9: install the expired-session handler once, so a stale token sends
  // the user back to the login screen instead of rendering empty tables.
  useEffect(() => { installSessionGuard(); }, []);

  if (!user) {
    if (authView === 'login') return <Login setUser={setUser} setView={setAuthView} />;
    if (authView === 'register') return <Register setView={setAuthView} />;
  }

  return (
    <Routes>
      {user?.role === 'DRIVER' && (
        <Route path="/driver/*" element={<DriverLayout />}>
          <Route index element={<DriverDashboard />} />
          <Route path="tours" element={<MyTours />} />
          <Route path="tours/:id" element={<TourDetails />} />
          <Route path="profile" element={<DriverProfile />} />
        </Route>
      )}
      
      <Route path="*" element={
        user?.role === 'CUSTOMER' ? (
          <CustomerLayout currentView={currentCustomerView} setCurrentView={setCurrentCustomerView} user={user}>
            {(() => {
              switch (currentCustomerView) {
                case '/': return <CustomerDashboard setCurrentView={setCurrentCustomerView} onGiveFeedback={giveFeedback} />;
                case '/tour-packages': return <CustomerTourPackages setCurrentView={setCurrentCustomerView} />;
                case '/my-inquiries': return <MyInquiries setCurrentView={setCurrentCustomerView} />;
                // '/my-itineraries' is retired; anything still pointing there
                // lands on the bookings list, which is where itineraries live
                // now.
                case '/my-itineraries': return <MyBookings setCurrentView={setCurrentCustomerView} />;
                case '/my-quotations': return <MyQuotations setCurrentView={setCurrentCustomerView} />;
                // "Pay Now" on a booking opens the payment form with that
                // booking already chosen, so the customer never picks it from
                // a list they just came from.
                case '/my-bookings': return <MyBookings setCurrentView={setCurrentCustomerView} onPayBooking={(id) => { setPayForBooking(id); setCurrentCustomerView('/my-payments'); }} onGiveFeedback={giveFeedback} />;
                case '/my-payments': return <MyPayments setCurrentView={setCurrentCustomerView} payForBooking={payForBooking} onPaymentFormClosed={() => setPayForBooking(null)} />;
                case '/my-feedback': return <MyFeedback setCurrentView={setCurrentCustomerView} feedbackForBooking={feedbackForBooking} onFeedbackFormClosed={() => setFeedbackForBooking(null)} />;
                case '/my-profile': return <MyProfile setCurrentView={setCurrentCustomerView} />;
                default: return <CustomerDashboard setCurrentView={setCurrentCustomerView} onGiveFeedback={giveFeedback} />;
              }
            })()}
          </CustomerLayout>
        ) : (user?.role === 'ADMIN' || user?.role === 'COORDINATOR') ? (
          // Fix 3.10: COORDINATOR is granted rights throughout SecurityConfig
          // but had no UI at all, so a coordinator logging in got a blank white
          // page. They now get the same back-office screens as an admin.
          <Layout currentView={currentAdminView} setCurrentView={setCurrentAdminView}>
            {(() => {
              switch (currentAdminView) {
                case '/': return <Dashboard setCurrentView={setCurrentAdminView} />;
                case '/customers': return <Customers />;
                case '/inquiries': return <Inquiries />;
                case '/tour-packages': return <TourPackages />;
                // The Itineraries tab is retired: an itinerary is edited
                // inside the tour package it belongs to.
                case '/itineraries': return <TourPackages />;
                case '/quotations': return <Quotations />;
                case '/bookings': return <Bookings />;
                case '/payments': return <Payments />;
                case '/vehicles': return <Vehicles />;
                case '/drivers': return <Drivers />;
                case '/feedback': return <Feedback setCurrentView={setCurrentAdminView} />;
                default: return <Dashboard setCurrentView={setCurrentAdminView} />;
              }
            })()}
          </Layout>
        ) : user?.role === 'DRIVER' ? (
          <Navigate to="/driver" replace />
        ) : (
          // Any other role used to render null - a blank white page with no
          // explanation and no way out.
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md text-center shadow-sm">
              <h2 className="text-lg font-bold text-gray-900 mb-2">No workspace for this account</h2>
              <p className="text-sm text-gray-500 mb-6">
                This account has the role "{user?.role || 'unknown'}", which has no screens in the
                app yet. Please contact an administrator.
              </p>
              <button
                onClick={() => {
                  localStorage.removeItem('user');
                  localStorage.removeItem('token');
                  window.location.href = '/';
                }}
                className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600"
              >
                Sign out
              </button>
            </div>
          </div>
        )
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

