import React, { useState, useEffect } from 'react';
import { checkTravelDates, todayIso, endDateFor } from '../../utils/filters';
import { API_BASE } from '../../api';
// This page used to carry its own copy of the itinerary modal, which fetched
// every itinerary in the system and searched the list for a matching package.
// The shared modal asks the server for just this package's itinerary.
import ItineraryModal from '../../components/ItineraryModal';

export default function CustomerTourPackages() {
  const [packages, setPackages] = useState([]);
  const [selectedPackage, setSelectedPackage] = useState(null);
  
  // Modal states for sending inquiry
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [showItineraryModal, setShowItineraryModal] = useState(false);
  const [inquiryStartDate, setInquiryStartDate] = useState('');
  // The end date is not the customer's to choose: a tour runs for the
  // package's duration, so it is derived from the start date and shown
  // read-only. The server recomputes it on submit, so the two cannot disagree.
  const inquiryEndDate = endDateFor(inquiryStartDate, selectedPackage?.durationDays);
  const [inquiryTravellers, setInquiryTravellers] = useState(1);
  const [inquiryAccommodation, setInquiryAccommodation] = useState('');
  const [inquiryTransportation, setInquiryTransportation] = useState('');
  const [inquiryNotes, setInquiryNotes] = useState('');

  // (This page navigates by setCurrentView, not react-router.)

  useEffect(() => {
    const fetchPackages = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_BASE}/api/packages`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setPackages(data.filter(p => p.packageStatus === 'Active' || p.packageStatus === 'active'));
        }
      } catch (e) {
        console.error('Failed to fetch packages:', e);
      }
    };
    fetchPackages();
  }, []);

  const handleSendInquiry = async (e) => {
    e.preventDefault();
    // Validation this modal never had (fixes 7.1, 7.2, 7.3): an end date
    // before the start, or a date in the past, was accepted.
    const dateError = checkTravelDates(inquiryStartDate, inquiryEndDate);
    if (dateError) {
      alert(dateError);
      return;
    }
    if (!inquiryTravellers || parseInt(inquiryTravellers) < 1) {
      alert('Number of travellers must be at least 1.');
      return;
    }
    const token = localStorage.getItem('token');

    // Using the full Inquiry object structure to match our updated InquiryController
    const inquiryData = {
      // The package the customer is enquiring about. The server stores it and
      // re-derives the end date from its duration, so the dates cannot
      // disagree with the tour that was booked.
      tourPackage: { packageId: selectedPackage.packageId },
      travelStartDate: inquiryStartDate,
      travelEndDate: inquiryEndDate,
      numberOfTravellers: parseInt(inquiryTravellers),
      destinationArea: selectedPackage.packageName, // Explicitly capture the package they clicked as the destination area
      accommodationRequirement: inquiryAccommodation,
      transportationRequirement: inquiryTransportation,
      additionalRequests: inquiryNotes
    };

    try {
      const res = await fetch(`${API_BASE}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(inquiryData)
      });
      
      if (res.ok) {
        alert('Inquiry sent successfully!');
        setShowInquiryModal(false);
        setInquiryStartDate('');
        setInquiryTravellers(1);
        setInquiryAccommodation('');
        setInquiryTransportation('');
        setInquiryNotes('');
      } else {
        const text = await res.text();
        alert('Failed to send inquiry: ' + text);
      }
    } catch (e) {
      console.error(e);
      alert('Error sending inquiry.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto relative">
      {!selectedPackage ? (
        <>
          <p className="text-gray-500 mb-6 text-sm">Browse available tour packages and destinations.</p>
          
          <div className="flex gap-4 mb-6">
            <input type="text" placeholder="Search tour packages..." className="bg-gray-100 border-none rounded px-4 py-2 text-sm w-64" />
            <select className="border border-gray-300 rounded px-4 py-2 text-sm bg-white"><option>Duration</option></select>
            <select className="border border-gray-300 rounded px-4 py-2 text-sm bg-white"><option>Destination</option></select>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {packages.map(pkg => (
              <div key={pkg.packageId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="h-40 bg-[#2a2a2a] relative">
                  <div className="absolute inset-0 opacity-50 bg-gradient-to-t from-[#f97316] to-transparent"></div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-xs text-gray-400 mb-1">{pkg.packageId}</p>
                  <h3 className="font-bold text-lg mb-2">{pkg.packageName}</h3>
                  <p className="text-xs text-gray-500 mb-1">{pkg.durationDays} Days / {pkg.durationDays - 1} Nights</p>
                  <p className="text-xs text-gray-500 mb-4 truncate">{pkg.description}</p>
                  <p className="text-[#f97316] font-bold mt-auto mb-4">From USD {pkg.price}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedPackage(pkg)} className="px-3 py-1.5 border border-[#f97316] text-[#f97316] rounded text-xs font-medium hover:bg-orange-50 w-1/2">View Details</button>
                    <button onClick={() => { setSelectedPackage(pkg); setShowInquiryModal(true); }} className="px-3 py-1.5 bg-[#f97316] text-white rounded text-xs font-medium hover:bg-orange-600 w-1/2">Send Inquiry</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {packages.length === 0 && (
            <div className="text-center py-10 text-gray-500">No active tour packages found.</div>
          )}

          {packages.length > 0 && (
            <div className="text-center mt-8">
              <span className="text-sm text-gray-500 mr-4">Showing {packages.length} of {packages.length} packages</span>
              <button className="text-[#f97316] font-bold text-sm">Load more</button>
            </div>
          )}
        </>
      ) : (
        <div className="max-w-5xl mx-auto space-y-6">
          <p className="text-gray-500 mb-6 text-sm">View tour package information and pricing.</p>
          
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="space-y-4">
                <div className="grid grid-cols-3">
                  <p className="text-sm font-medium text-gray-700">Package ID</p>
                  <p className="text-sm col-span-2 font-bold">{selectedPackage.packageId}</p>
                </div>
                <div className="grid grid-cols-3">
                  <p className="text-sm font-medium text-gray-700">Package Name</p>
                  <p className="text-sm col-span-2">{selectedPackage.packageName}</p>
                </div>
                <div className="grid grid-cols-3">
                  <p className="text-sm font-medium text-gray-700">Duration</p>
                  <p className="text-sm col-span-2">{selectedPackage.durationDays} Days / {selectedPackage.durationDays - 1} Nights</p>
                </div>
                <div className="grid grid-cols-3">
                  <p className="text-sm font-medium text-gray-700">Base Price</p>
                  <p className="text-sm col-span-2">USD {selectedPackage.price}</p>
                </div>
                <div className="grid grid-cols-3 pt-2">
                  <p className="text-sm font-medium text-gray-700">Description</p>
                  <p className="text-sm col-span-2 text-gray-600">{selectedPackage.description}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setSelectedPackage(null)} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50">Back</button>
                <button onClick={() => setShowItineraryModal(true)} className="px-4 py-2 border border-[#f97316] text-[#f97316] rounded text-sm font-medium hover:bg-orange-50">View Itinerary</button>
                <button onClick={() => setShowInquiryModal(true)} className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">Send Inquiry</button>
              </div>
            </div>
            
            <div className="col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-fit">
               <div className="h-32 bg-[#2a2a2a] relative">
                 <div className="absolute inset-0 opacity-50 bg-gradient-to-t from-[#f97316] to-transparent"></div>
               </div>
               <div className="p-4">
                 <h3 className="font-bold mb-3 text-sm">Trip at a glance</h3>
                 <ul className="text-xs text-gray-600 space-y-2">
                   <li>Starts: Colombo / Airport</li>
                   <li>Ends: Colombo / Airport</li>
                   <li>Day-by-day plan: {selectedPackage.durationDays} days available</li>
                 </ul>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Inquiry Modal */}
      {showInquiryModal && selectedPackage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
            <h2 className="text-xl font-bold mb-2">Inquire: {selectedPackage.packageName}</h2>
            <p className="text-sm text-gray-600 mb-4">Let us know when you'd like to travel and how many people are in your group.</p>
            
            <form onSubmit={handleSendInquiry}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Start Date *</label>
                  <input 
                    type="date" 
                    required 
                    min={todayIso()}
                    className="w-full border border-gray-300 p-2 rounded text-sm" 
                    value={inquiryStartDate} 
                    onChange={e => setInquiryStartDate(e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">End Date</label>
                  <input
                    type="date"
                    readOnly
                    disabled
                    className="w-full border border-gray-300 p-2 rounded text-sm bg-gray-100 text-gray-500"
                    value={inquiryEndDate}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Set automatically - this tour runs {selectedPackage.durationDays} day
                    {selectedPackage.durationDays === 1 ? '' : 's'}.
                  </p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-gray-700">Number of Travellers *</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  className="w-full border border-gray-300 p-2 rounded text-sm" 
                  value={inquiryTravellers} 
                  onChange={e => setInquiryTravellers(e.target.value)} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Accommodation</label>
                  <select className="w-full border border-gray-300 p-2 rounded text-sm bg-white" 
                    value={inquiryAccommodation} onChange={e => setInquiryAccommodation(e.target.value)}>
                    <option value="">Select</option>
                    <option value="3-Star Hotel">3-Star Hotel</option>
                    <option value="4-Star Hotel">4-Star Hotel</option>
                    <option value="5-Star Hotel">5-Star Hotel</option>
                    <option value="Boutique Villa">Boutique Villa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Transportation</label>
                  <select className="w-full border border-gray-300 p-2 rounded text-sm bg-white"
                    value={inquiryTransportation} onChange={e => setInquiryTransportation(e.target.value)}>
                    <option value="">Select</option>
                    <option value="Car (1-3 pax)">Car (1-3 pax)</option>
                    <option value="Micro Van (4-6 pax)">Micro Van (4-6 pax)</option>
                    <option value="Mini Coach (7-12 pax)">Mini Coach (7-12 pax)</option>
                  </select>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1 text-gray-700">Additional Requests (Optional)</label>
                <textarea 
                  className="w-full border border-gray-300 p-2 rounded text-sm" 
                  rows="3" 
                  placeholder="Dietary requirements, accessibility needs, etc."
                  value={inquiryNotes} 
                  onChange={e => setInquiryNotes(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowInquiryModal(false)} className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#f97316] text-white rounded text-sm font-medium hover:bg-orange-600">Submit Inquiry</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Itinerary Modal */}
      <ItineraryModal
        isOpen={showItineraryModal}
        onClose={() => setShowItineraryModal(false)}
        source={{ type: 'package', id: selectedPackage?.packageId }}
        subtitle={selectedPackage?.packageName}
      />
    </div>
  );
}
