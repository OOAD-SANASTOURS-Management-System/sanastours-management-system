import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import { API_BASE } from '../api';
import { isCancelled } from './tourState';

// Fix 5.8: the step names live in one place so the buttons, the progress list
// and the completion check can never drift apart again.
const STEP_TOUR_STARTED = 'Tour Started';
const STEP_DROPPED = 'Dropped at Destination';
const STEP_RETURN_STARTED = 'Return Journey Started';
const STEP_TOUR_ENDED = 'Tour Ended';
const STEPS = [STEP_TOUR_STARTED, STEP_DROPPED, STEP_RETURN_STARTED, STEP_TOUR_ENDED];

// Older rows may carry the previous wording for the same step.
const LEGACY_STEP_NAMES = {
  [STEP_TOUR_STARTED]: ['Start Tour'],
  [STEP_DROPPED]: ['Tourists Dropped at Destination'],
  [STEP_RETURN_STARTED]: ['Start Return Journey'],
  [STEP_TOUR_ENDED]: ['End Tour']
};

const matchesStep = (update, step) =>
  update.stepName === step || (LEGACY_STEP_NAMES[step] || []).includes(update.stepName);

/** Combine the time the driver entered with today's date, as a LocalDateTime. */
const toUpdateTime = (time) => {
  if (!time) return null;
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
};

const TripUpdateModal = ({ isOpen, onClose, stepName, onSubmit }) => {
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ time, location, driverNote: note, stepName });
    setTime('');
    setLocation('');
    setNote('');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[500px]">
        <h2 className="text-xl font-bold mb-4">{stepName}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Time</label>
            <input type="time" required className="w-full border p-2 rounded" value={time} onChange={e => setTime(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Location</label>
            <input type="text" required className="w-full border p-2 rounded" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Note (Optional)</label>
            <textarea className="w-full border p-2 rounded" rows="3" value={note} onChange={e => setNote(e.target.value)}></textarea>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">Submit Update</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ItineraryModal = ({ isOpen, onClose, itineraryDays }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[700px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Tour Itinerary</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl">&times;</button>
        </div>
        {itineraryDays && itineraryDays.length > 0 ? (
          <div className="space-y-4">
            {itineraryDays.sort((a,b)=>a.dayNumber-b.dayNumber).map((day, idx) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-md">
                <p className="font-bold text-lg mb-1">Day {day.dayNumber}: {day.title}</p>
                <p className="text-sm text-gray-600 whitespace-pre-wrap mb-2">{day.activities}</p>
                {day.location && <p className="text-sm text-gray-500"><span className="font-semibold">Location:</span> {day.location}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No itinerary available.</p>
        )}
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Close</button>
        </div>
      </div>
    </div>
  );
};

const TourDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [itineraryDays, setItineraryDays] = useState([]);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [itineraryModalOpen, setItineraryModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  const fetchDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const bRes = await fetch(`${API_BASE}/api/bookings`, { headers });
      if (bRes.ok) {
        const bookings = await bRes.json();
        const found = bookings.find(b => b.bookingId === parseInt(id));
        setBooking(found);
        
        if (found && found.itinerary) {
          const dRes = await fetch(`${API_BASE}/api/itineraries/${found.itinerary.itineraryId}/days`, { headers });
          if (dRes.ok) setItineraryDays(await dRes.json());
        }
      }
      
      const uRes = await fetch(`${API_BASE}/api/trip-updates/booking/${id}`, { headers });
      if (uRes.ok) {
        setUpdates(await uRes.json());
      }
    } catch (err) {
      console.error('Error fetching tour details', err);
    }
  };

  useEffect(() => {
    fetchDetails();

    // Keep this screen current the same way the dashboard does, so a tour
    // cancelled by the office while the driver has it open does not keep
    // showing a "Mark as Done" button.
    const refresh = () => { if (!document.hidden) fetchDetails(); };
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleUpdate = async (data) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

      const payload = {
        booking: { bookingId: parseInt(id) },
        stepName: data.stepName,
        location: data.location,
        driverNote: data.driverNote,
        // Fix 5.9: the time the driver entered used to be collected by the
        // modal and then dropped, so every step was stamped with the moment
        // the form happened to be submitted. Send it through instead.
        updateTime: toUpdateTime(data.time)
      };

      const res = await fetch(`${API_BASE}/api/trip-updates`, { method: 'POST', headers, body: JSON.stringify(payload) });

      if (!res.ok) {
        const text = await res.text();
        alert('Failed to save update: ' + text);
        return;
      }

      // Fix 5.8: this compared against 'End Tour', but the buttons send the
      // step names in STEPS - the last of which is 'Tour Ended' - so the
      // booking was never completed. Fix 4.20: the first step now moves the
      // booking to Ongoing, a status nothing used to set.
      let newStatus = null;
      if (data.stepName === STEP_TOUR_STARTED) newStatus = 'Ongoing';
      if (data.stepName === STEP_TOUR_ENDED) newStatus = 'Completed';

      if (newStatus) {
        // Fix 2.4: drivers use the narrow status endpoint rather than a full
        // booking update, so they can no longer rewrite the whole booking.
        const sRes = await fetch(`${API_BASE}/api/bookings/${id}/status`, {
          method: 'PUT', headers, body: JSON.stringify({ bookingStatus: newStatus })
        });
        if (!sRes.ok) alert('Update saved, but the tour status could not be changed: ' + await sRes.text());
      }

      setUpdateModalOpen(false);
      fetchDetails();
    } catch (err) {
      console.error('Error saving trip update', err);
      alert('Error saving trip update.');
    }
  };

  if (!booking) return (
    <div className="flex-1 flex flex-col h-screen">
      <Topbar title="Tour Details" />
      <div className="p-8">Loading...</div>
    </div>
  );

  const steps = STEPS;

  // Fix 5.11: work out how far the tour has actually got by matching step
  // names, instead of counting rows. The old code used `updates.length === idx`,
  // so one duplicate or out-of-order row made the wrong buttons appear.
  const completedSteps = steps.map(step => updates.some(u => matchesStep(u, step)));
  const nextStepIndex = completedSteps.indexOf(false);

  const tourCancelled = isCancelled(booking);


  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Topbar title="Tour Details" />
      
      <div className="p-8 max-w-[1200px] w-full">
        <p className="text-gray-500 mb-6">Review this tour and its trip history.</p>

        {/* The office can cancel a tour after it has been assigned, and the
            driver needs to see that here rather than discovering it when a
            trip update is refused. */}
        {tourCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="font-bold text-sm text-red-800 mb-1">This tour has been cancelled</p>
            <p className="text-sm text-red-700">
              Do not travel for it. Contact the office if you were already on your way.
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Left Column: Tour Information */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gray-200 px-6 py-4">
                <h2 className="font-bold text-gray-800">Tour Information</h2>
              </div>
              
              <div className="px-6 py-2">
                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Booking ID</span>
                  <span className="text-sm font-bold text-gray-800">BK-{booking.bookingId.toString().padStart(3, '0')}</span>
                </div>
                
                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Tour Package</span>
                  <span className="text-sm text-gray-600">{booking.tourPackage?.packageName || 'N/A'}</span>
                </div>
                
                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Travel Dates</span>
                  <span className="text-sm text-gray-600">
                    {formatDate(booking.travelStartDate)} to {formatDate(booking.travelEndDate)}
                  </span>
                </div>
                
                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Travellers</span>
                  <span className="text-sm text-gray-600">{booking.numberOfPeople}</span>
                </div>
                
                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Customer</span>
                  <span className="text-sm text-gray-600">
                    {booking.customer ? `${booking.customer.firstName} ${booking.customer.lastName}` : 'N/A'}
                  </span>
                </div>
                
                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Customer Phone</span>
                  <span className="text-sm text-gray-600">{booking.customer?.phone || 'N/A'}</span>
                </div>
                
                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Initial Location</span>
                  <span className="text-sm text-gray-600">{booking.initialLocation || 'N/A'}</span>
                </div>
                
                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Destination</span>
                  <span className="text-sm text-gray-600">
                    {booking.quotation?.inquiry?.destinationArea || 'N/A'}
                  </span>
                </div>

                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Return Drop-off</span>
                  <span className="text-sm text-gray-600">{booking.returnDropOffLocation || 'N/A'}</span>
                </div>

                <div className="flex py-3 border-b border-gray-100">
                  <span className="w-48 font-medium text-sm text-gray-800">Vehicle</span>
                  <span className="text-sm text-gray-600">
                    {booking.vehicle ? `${booking.vehicle.model} ${booking.vehicle.vehicleType}, ${booking.vehicle.registrationNo} (${booking.vehicle.capacity} seats)` : 'N/A'}
                  </span>
                </div>

                <div className="flex py-3">
                  <span className="w-48 font-medium text-sm text-gray-800">Status</span>
                  <span className={`text-xs px-2 py-1 rounded font-medium text-white ${booking.bookingStatus?.toLowerCase() === 'completed' ? 'bg-[#14532d]' : 'bg-[#1d4ed8]'}`}>
                    {booking.bookingStatus}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => navigate('/driver/tours')}
                className="px-6 py-2 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50 font-medium"
              >
                Back
              </button>
              <button 
                onClick={() => setItineraryModalOpen(true)}
                className="px-6 py-2 border border-orange-500 rounded text-orange-500 bg-white hover:bg-orange-50 font-medium"
              >
                View Itinerary
              </button>
            </div>
          </div>

          {/* Right Column: Trip Progress */}
          <div className="w-[400px]">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 sticky top-24">
              <h2 className="font-bold text-gray-800 mb-6">Trip Progress</h2>
              
              <div className="space-y-0 relative">
                {steps.map((step, idx) => {
                  // Fallback match to catch old dummy data step names too
                  const dbUpdate = updates.find(u => matchesStep(u, step));
                  const isCompleted = !!dbUpdate;
                  const isLast = idx === steps.length - 1;

                  return (
                    <div key={idx} className="flex gap-4 min-h-[80px]">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs z-10 ${isCompleted ? 'bg-[#16a34a]' : 'bg-gray-200'}`}>
                          {isCompleted && '✓'}
                        </div>
                        {!isLast && <div className="w-[2px] flex-1 bg-gray-200 -mt-2"></div>}
                        {isLast && isCompleted && <div className="w-[2px] h-full bg-white -mt-2"></div>}
                      </div>
                      <div className="pb-8 -mt-1 flex-1">
                        <p className={`font-bold text-sm ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>{step}</p>
                        
                        {isCompleted && (
                          <div className="mt-1">
                            <p className="text-xs text-gray-500 leading-tight">
                              {dbUpdate.driverNote ? dbUpdate.driverNote : (
                                step === 'Tour Started' ? `Left ${dbUpdate.location} with ${booking.numberOfPeople} tourists` :
                                step === 'Dropped at Destination' ? `Tourists dropped at ${dbUpdate.location}` :
                                step === 'Return Journey Started' ? `Tourists picked up from ${dbUpdate.location}` :
                                `Tourists dropped at ${dbUpdate.location}`
                              )}
                            </p>
                            <p className="text-xs font-medium text-gray-700 mt-1">
                              {formatDate(dbUpdate.updateTime)}, {formatTime(dbUpdate.updateTime)}
                            </p>
                          </div>
                        )}

                        {/* A cancelled tour takes no further updates: the
                            office has called it off, and the server refuses
                            them too. */}
                        {!isCompleted && idx === nextStepIndex && !tourCancelled && (
                          <button
                            onClick={() => { setCurrentStep(step); setUpdateModalOpen(true); }}
                            className="mt-2 text-xs bg-orange-500 text-white px-3 py-1.5 rounded font-medium hover:bg-orange-600"
                          >
                            Mark as Done
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <TripUpdateModal 
        isOpen={updateModalOpen} 
        onClose={() => setUpdateModalOpen(false)} 
        stepName={currentStep} 
        onSubmit={handleUpdate} 
      />
      
      <ItineraryModal 
        isOpen={itineraryModalOpen}
        onClose={() => setItineraryModalOpen(false)}
        itineraryDays={itineraryDays}
      />
    </div>
  );
};

export default TourDetails;
