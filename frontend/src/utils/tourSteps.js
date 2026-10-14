/**
 * The steps of a tour, in order, in one place.
 *
 * The driver records these; the office and the customer read them. They were
 * previously declared three times - in the driver dashboard, in the tour
 * detail screen with its own legacy-name handling, and implicitly in the
 * backend's whitelist - so a rename in one place quietly broke matching in
 * another. Anything that shows trip progress now reads them from here.
 */
export const TOUR_STEPS = [
  'Tour Started',
  'Dropped at Destination',
  'Return Journey Started',
  'Tour Ended'
];

/** Rows written before the step names were settled still carry the old wording. */
export const LEGACY_STEP_NAMES = {
  'Tour Started': ['Start Tour'],
  'Dropped at Destination': ['Tourists Dropped at Destination'],
  'Return Journey Started': ['Start Return Journey'],
  'Tour Ended': ['End Tour']
};

/** Does this stored update represent the given step, old wording included? */
export const matchesStep = (update, step) =>
  update?.stepName === step || (LEGACY_STEP_NAMES[step] || []).includes(update?.stepName);

/** The recorded update for a step, or undefined. */
export const updateForStep = (updates, step) =>
  (updates || []).find((u) => matchesStep(u, step));

/** Which steps are done, as an array of booleans in step order. */
export const completedSteps = (updates) =>
  TOUR_STEPS.map((step) => (updates || []).some((u) => matchesStep(u, step)));

/**
 * The next step not yet recorded, or null when the tour is finished.
 *
 * Worked out by matching step names rather than counting rows, so one
 * duplicate or out-of-order update cannot shift the whole sequence.
 */
export const nextStepFor = (updates) =>
  TOUR_STEPS.find((step) => !(updates || []).some((u) => matchesStep(u, step))) || null;

/** How many of the steps are done, for a "2 of 4" style summary. */
export const stepsDoneCount = (updates) => completedSteps(updates).filter(Boolean).length;

/** The most recently recorded update, by the time the driver logged. */
export const latestUpdate = (updates) =>
  (updates || []).reduce((latest, u) => {
    if (!u?.updateTime) return latest;
    if (!latest?.updateTime) return u;
    return new Date(u.updateTime) > new Date(latest.updateTime) ? u : latest;
  }, null);
