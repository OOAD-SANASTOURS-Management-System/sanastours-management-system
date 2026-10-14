import React from 'react';
import { TOUR_STEPS, updateForStep, nextStepFor, stepsDoneCount, latestUpdate } from '../utils/tourSteps';

/**
 * The four-step tour tracker, drawn the same way wherever it appears.
 *
 * The driver records the steps; this is what the office sees of that progress.
 * One component so the two sides cannot show the same tour at different
 * stages, and so a step rename is a one-line change rather than a hunt.
 */

const formatWhen = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};

/**
 * @param updates  the trip updates recorded against the booking
 * @param showDetail  include each step's location and time underneath
 */
const TripProgress = ({ updates = [], showDetail = false }) => {
  const next = nextStepFor(updates);
  const done = stepsDoneCount(updates);
  const last = latestUpdate(updates);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-3">
        <p className="text-xs font-semibold text-gray-600">
          Trip progress - {done} of {TOUR_STEPS.length} steps
        </p>
        {last && (
          <p className="text-xs text-gray-400">
            Last update {formatWhen(last.updateTime)}
          </p>
        )}
      </div>

      <div className="relative">
        {/* The rail the markers sit on. */}
        <div className="absolute top-3 left-0 right-0 h-0.5 bg-gray-200"></div>
        <div
          className="absolute top-3 left-0 h-0.5 bg-green-600 transition-all"
          style={{ width: done === 0 ? '0%' : `${((done - 1) / (TOUR_STEPS.length - 1)) * 100}%` }}
        ></div>

        <div className="relative flex justify-between">
          {TOUR_STEPS.map((step, i) => {
            const record = updateForStep(updates, step);
            const isDone = Boolean(record);
            const isNext = step === next;
            return (
              <div key={step} className="flex flex-col items-center text-center" style={{ width: `${100 / TOUR_STEPS.length}%` }}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ring-4 ring-white ${
                  isDone
                    ? 'bg-green-600 text-white'
                    : isNext
                      ? 'bg-white border-2 border-[#f97316] text-[#f97316]'
                      : 'bg-white border-2 border-gray-300 text-gray-400'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
                <p className={`text-[11px] mt-1.5 leading-tight ${isDone ? 'text-gray-800 font-medium' : isNext ? 'text-[#f97316] font-medium' : 'text-gray-400'}`}>
                  {step}
                </p>
                {isDone && (
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatWhen(record.updateTime)}</p>
                )}
                {!isDone && isNext && (
                  <p className="text-[10px] text-gray-400 mt-0.5">Awaiting driver</p>
                )}
                {showDetail && isDone && record.location && (
                  <p className="text-[10px] text-gray-500 mt-0.5">{record.location}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* The driver's own words on the latest step, which is the part the
          office would otherwise have to telephone for. */}
      {showDetail && last?.driverNote && (
        <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded p-2 mt-4">
          <span className="font-medium">Driver note:</span> {last.driverNote}
        </p>
      )}
    </div>
  );
};

export default TripProgress;
