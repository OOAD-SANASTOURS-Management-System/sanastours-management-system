import React, { useState, useEffect } from 'react';
import { API_BASE } from '../api';

/**
 * Shared day-by-day itinerary display.
 *
 * An itinerary is no longer a section of its own: a customer reaches it from
 * the booking or package it belongs to, and an admin from inside the tour
 * package. Both read the same thing, so both render it from here.
 */

/** The read-only day list, used inside the modal and on the admin package page. */
export const ItineraryDayList = ({ days }) => {
  if (!days || days.length === 0) {
    return <p className="text-gray-500 text-sm">No day-by-day plan has been added yet.</p>;
  }
  return (
    <div className="space-y-4">
      {days.map((day, idx) => (
        <div key={day.dayId ?? idx} className="p-4 border border-gray-200 rounded-md">
          <p className="font-bold text-base mb-1">Day {day.dayNumber ?? idx + 1}: {day.title}</p>
          {day.location && (
            <p className="text-sm text-gray-500 mb-2"><span className="font-semibold">Location:</span> {day.location}</p>
          )}
          {day.activities && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{day.activities}</p>
          )}
        </div>
      ))}
    </div>
  );
};

/**
 * Fetch one itinerary by what it belongs to.
 * @param source {{ type: 'booking' | 'package', id: string | number }}
 */
export const fetchItinerary = async (source) => {
  const { type, id } = source || {};
  if (id === undefined || id === null || id === '') return null;

  // Spelled out rather than interpolated, so a bad `type` fails here instead
  // of becoming a 404 against a URL that was never a real endpoint.
  let url;
  if (type === 'booking') url = `${API_BASE}/api/itineraries/booking/${id}`;
  else if (type === 'package') url = `${API_BASE}/api/itineraries/package/${id}`;
  else throw new Error(`Unknown itinerary source: ${type}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });
  if (!res.ok) throw new Error(await res.text() || 'Could not load the itinerary.');
  return res.json();
};

export default function ItineraryModal({ isOpen, onClose, source, title = 'Tour Itinerary', subtitle }) {
  const [itinerary, setItinerary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sourceType = source?.type;
  const sourceId = source?.id;

  useEffect(() => {
    if (!isOpen || !sourceType || !sourceId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchItinerary({ type: sourceType, id: sourceId });
        if (!cancelled) setItinerary(data);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Could not load the itinerary.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // The modal can be closed and reopened on a different booking before the
    // first request lands; without this the older response would win.
    return () => { cancelled = true; };
  }, [isOpen, sourceType, sourceId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[700px] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold">{itinerary?.itineraryName || title}</h2>
            {(subtitle || itinerary?.packageName) && (
              <p className="text-sm text-gray-500 mt-1">{subtitle || itinerary?.packageName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 font-bold text-xl leading-none">&times;</button>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm">Loading itinerary...</p>
        ) : error ? (
          <p className="text-red-600 text-sm">{error}</p>
        ) : itinerary?.found ? (
          <ItineraryDayList days={itinerary.days} />
        ) : (
          <p className="text-gray-500 text-sm">
            No itinerary has been prepared for this {sourceType === 'booking' ? 'booking' : 'package'} yet.
          </p>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm font-medium">Close</button>
        </div>
      </div>
    </div>
  );
}
