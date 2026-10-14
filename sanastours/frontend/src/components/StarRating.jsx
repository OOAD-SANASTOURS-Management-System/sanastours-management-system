import React from 'react';

const LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };

/** "4 out of 5 - Very good" */
export const ratingText = (rating) =>
  rating >= 1 && rating <= 5 ? `${rating} out of 5 - ${LABELS[rating]}` : 'Not rated';

const Star = ({ filled, size }) => (
  <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true"
    className={filled ? 'text-[#f97316]' : 'text-gray-300'} fill="currentColor">
    <path d="M10 1.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6L10 15l-5.4 3 1.2-6L1.3 7.8l6.1-.7L10 1.5z" />
  </svg>
);

/**
 * Five stars. Read-only by default; pass onChange to make them clickable
 * (a keyboard user can focus each star and press Enter or Space).
 */
export default function StarRating({ value = 0, onChange, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : 'img'}
      aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="p-0.5 rounded hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-orange-300">
            <Star filled={n <= value} size={size} />
          </button>
        ) : (
          <Star key={n} filled={n <= value} size={size} />
        )
      )}
    </span>
  );
}
