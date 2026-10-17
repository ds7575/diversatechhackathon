/** JSON wire contracts. IDs are opaque strings; dates are YYYY-MM-DD; times are UTC ISO strings. */
export const IMPORT_STATUSES = Object.freeze(['queued', 'processing', 'ready', 'partially_ready', 'needs_confirmation', 'failed']);
export const MATCH_STATUSES = Object.freeze(['confirmed', 'uncertain']);
export const REACTIONS = Object.freeze(['interested', 'pass']); // Missing row means no response.
export const CONCERNS = Object.freeze(['price', 'distance', 'effort']);
export const MEMBER_FITS = Object.freeze(['strong', 'good', 'mixed', 'poor', 'blocked', 'insufficient_information']);
export const RECOMMENDATION_VERDICTS = Object.freeze(['strong_match', 'recommended', 'mixed_fit', 'not_recommended', 'needs_more_information']);
export const EVIDENCE_STATUSES = Object.freeze(['confirmed', 'partial', 'uncertain']);
export const BUDGET_LEVELS = Object.freeze(['budget', 'moderate', 'premium']);
export const ACTIVITY_LEVELS = Object.freeze(['low', 'medium', 'high']);
export const CROWD_PREFERENCES = Object.freeze(['avoid', 'neutral', 'enjoy']);
export const ROUTES = Object.freeze({
  createTrip: ['POST', '/trips'], joinTrip: ['POST', '/trips/:tripId/members'],
  snapshot: ['GET', '/trips/:tripId'], preferences: ['PATCH', '/trips/:tripId/members/me'],
  importReel: ['POST', '/trips/:tripId/imports'],
  react: ['PUT', '/trips/:tripId/places/:placeId/reaction'],
  concern: ['POST', '/trips/:tripId/places/:placeId/concerns'],
  generatePlan: ['POST', '/trips/:tripId/plan/generate'],
  savePlan: ['PUT', '/trips/:tripId/plan'],
});
export function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a nonempty string`);
}
function stringList(value, name) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim()))
    throw new TypeError(`${name} must be an array of nonempty strings`);
}
function optionalEnum(value, allowed, name) {
  if (value !== undefined && !allowed.includes(value)) throw new TypeError(`Invalid ${name}`);
}
function knownKeys(value, allowed, name) {
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  if (unknown.length) throw new TypeError(`${name} contains unsupported fields: ${unknown.join(', ')}`);
}

/** Stable criteria shape shared by onboarding, storage and model input. */
export function validatePreferences(preferences = {}) {
  if (!preferences || typeof preferences !== 'object' || Array.isArray(preferences)) throw new TypeError('preferences must be an object');
  knownKeys(preferences, ['interests', 'budgetLevel', 'activityLevel', 'crowdPreference', 'maxTravelMinutes'], 'preferences');
  stringList(preferences.interests ?? [], 'interests');
  optionalEnum(preferences.budgetLevel, BUDGET_LEVELS, 'budgetLevel');
  optionalEnum(preferences.activityLevel, ACTIVITY_LEVELS, 'activityLevel');
  optionalEnum(preferences.crowdPreference, CROWD_PREFERENCES, 'crowdPreference');
  if (preferences.maxTravelMinutes !== undefined &&
      (!Number.isInteger(preferences.maxTravelMinutes) || preferences.maxTravelMinutes < 0 || preferences.maxTravelMinutes > 240))
    throw new TypeError('maxTravelMinutes must be an integer from 0 to 240');
  return preferences;
}

/** Hard constraints are separate because only these may veto a recommendation. */
export function validateFirmLimits(firmLimits = {}) {
  if (!firmLimits || typeof firmLimits !== 'object' || Array.isArray(firmLimits)) throw new TypeError('firmLimits must be an object');
  knownKeys(firmLimits, ['maxPriceLevel', 'accessibilityRequired', 'prohibitedActivities'], 'firmLimits');
  if (firmLimits.maxPriceLevel !== undefined &&
      (!Number.isInteger(firmLimits.maxPriceLevel) || firmLimits.maxPriceLevel < 1 || firmLimits.maxPriceLevel > 4))
    throw new TypeError('maxPriceLevel must be an integer from 1 to 4');
  if (firmLimits.accessibilityRequired !== undefined && typeof firmLimits.accessibilityRequired !== 'boolean')
    throw new TypeError('accessibilityRequired must be boolean');
  stringList(firmLimits.prohibitedActivities ?? [], 'prohibitedActivities');
  return firmLimits;
}

export function validateMemberCriteria(member) {
  required(member?.id, 'member.id'); required(member?.displayName, 'member.displayName');
  validatePreferences(member.preferences ?? {}); validateFirmLimits(member.firmLimits ?? {});
  return member;
}
export function validateTrip(input) {
  required(input.name, 'name'); required(input.destination, 'destination');
  if (!isDate(input.startDate) || !isDate(input.endDate) || input.endDate < input.startDate)
    throw new TypeError('Trip dates must be valid and ordered');
  if ((Date.parse(input.endDate) - Date.parse(input.startDate)) / 86400000 > 29)
    throw new RangeError('Prototype trips support at most 30 days');
  return input;
}
export function normalizeReelUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['instagram.com', 'www.instagram.com'].includes(url.hostname) || url.port || url.username || url.password)
    throw new TypeError('Expected a public HTTPS Instagram Reel URL');
  const match = /^\/reel\/([A-Za-z0-9_-]+)\/?$/.exec(url.pathname);
  if (!match) throw new TypeError('Expected /reel/<shortcode>/');
  return `https://www.instagram.com/reel/${match[1]}/`;
}
export function validateAssignments(assignments, places, trip) {
  validateTrip(trip);
  if (!Array.isArray(assignments)) throw new TypeError('assignments must be an array');
  const known = new Map(places.map(p => [p.id, p])); const seen = new Set(); const slots = new Set();
  for (const a of assignments) {
    const place = known.get(a.placeId);
    if (!place || place.tripId !== trip.id || seen.has(a.placeId)) throw new TypeError('Unknown, cross-trip, or repeated place');
    seen.add(a.placeId);
    if (a.date !== null && (!isDate(a.date) || a.date < trip.startDate || a.date > trip.endDate || place.matchStatus !== 'confirmed'))
      throw new TypeError('Only confirmed places can be assigned within trip dates');
    if (!Number.isInteger(a.position) || a.position < 0 || typeof a.manual !== 'boolean') throw new TypeError('Invalid position or manual flag');
    required(a.reason, 'reason');
    const slot = `${a.date}:${a.position}`;
    if (slots.has(slot)) throw new TypeError('Repeated position within a bucket');
    slots.add(slot);
  }
  if (seen.size !== known.size) throw new TypeError('Every saved place must have one assignment, including Unassigned');
  return assignments;
}

/** Validate the provider-independent recommendation returned to the frontend. */
export function validateRecommendation(recommendation, places, members) {
  const place = places.find(item => item.id === recommendation?.placeId);
  if (!place) throw new TypeError('Recommendation must reference a known place');
  if (!RECOMMENDATION_VERDICTS.includes(recommendation.verdict)) throw new TypeError('Invalid recommendation verdict');
  if (!Number.isInteger(recommendation.score) || recommendation.score < 0 || recommendation.score > 100)
    throw new TypeError('Recommendation score must be an integer from 0 to 100');
  required(recommendation.headline, 'headline'); required(recommendation.text, 'text');
  if (!EVIDENCE_STATUSES.includes(recommendation.evidenceStatus)) throw new TypeError('Invalid evidence status');
  if (!Array.isArray(recommendation.memberEvaluations)) throw new TypeError('memberEvaluations must be an array');
  const expected = new Set(members.map(member => member.id)); const seen = new Set();
  for (const evaluation of recommendation.memberEvaluations) {
    if (!expected.has(evaluation.memberId) || seen.has(evaluation.memberId))
      throw new TypeError('Each member must have exactly one evaluation');
    seen.add(evaluation.memberId);
    if (!MEMBER_FITS.includes(evaluation.fit)) throw new TypeError('Invalid member fit');
    stringList(evaluation.matchedCriteria, 'matchedCriteria');
    stringList(evaluation.conflicts, 'conflicts');
  }
  if (seen.size !== expected.size) throw new TypeError('Each member must have exactly one evaluation');
  if (place.matchStatus !== 'confirmed' && !['needs_more_information', 'not_recommended'].includes(recommendation.verdict))
    throw new TypeError('An uncertain place cannot be recommended');
  return recommendation;
}

/** Validate the denormalized read model used by the Pinterest-style trip board. */
export function validateTripBoard(board, trip, places) {
  if (board?.tripId !== trip.id) throw new TypeError('Board must belong to the trip');
  required(board.title, 'board.title'); required(board.gist, 'board.gist');
  if (!Array.isArray(board.days) || !Array.isArray(board.ideas)) throw new TypeError('Board days and ideas must be arrays');
  const known = new Set(places.map(place => place.id)); const seen = new Set();
  for (const day of board.days) {
    if (!isDate(day.date) || day.date < trip.startDate || day.date > trip.endDate) throw new TypeError('Board day is outside trip dates');
    required(day.label, 'day.label'); required(day.gist, 'day.gist');
    if (!Array.isArray(day.cards)) throw new TypeError('day.cards must be an array');
    for (const card of day.cards) {
      if (!known.has(card.placeId) || seen.has(card.placeId)) throw new TypeError('Board cards must reference unique known places');
      seen.add(card.placeId); required(card.name, 'card.name'); required(card.headline, 'card.headline'); required(card.text, 'card.text');
      if (card.sourceReel) required(card.sourceReel.url, 'card.sourceReel.url');
    }
  }
  for (const card of board.ideas) {
    if (!known.has(card.placeId) || seen.has(card.placeId)) throw new TypeError('Idea cards must reference unique known places');
    seen.add(card.placeId); required(card.name, 'card.name'); required(card.headline, 'card.headline'); required(card.text, 'card.text');
    if (card.sourceReel) required(card.sourceReel.url, 'card.sourceReel.url');
  }
  if (seen.size !== known.size) throw new TypeError('Every place must appear on the board');
  return board;
}
