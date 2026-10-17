const { randomUUID } = require('node:crypto');
const { extractInstagram } = require('./instagram-extract');

function nonempty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a nonempty string`);
  return value.trim();
}

function optionalString(value, name) {
  if (value == null) return null;
  if (typeof value !== 'string') throw new TypeError(`${name} must be a string or null`);
  return value.trim() || null;
}

function optionalCoordinate(value, name) {
  if (value == null) return null;
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number or null`);
  return value;
}

function buildPlaceSearchQuery(candidate, tripDestination) {
  if (!candidate || typeof candidate !== 'object') throw new TypeError('candidate is required');
  return [candidate.name, candidate.locationContext, tripDestination]
    .filter(value => typeof value === 'string' && value.trim())
    .map(value => value.trim())
    .join(', ');
}

function normalizePlaceMatch(value) {
  if (!value || typeof value !== 'object') throw new TypeError('searchPlace must return an object or null');
  const latitude = optionalCoordinate(value.latitude, 'place match latitude');
  const longitude = optionalCoordinate(value.longitude, 'place match longitude');
  if ((latitude === null) !== (longitude === null)) throw new TypeError('place match coordinates must be both present or both null');
  const facts = value.facts == null ? [] : value.facts;
  if (!Array.isArray(facts) || facts.some(fact => typeof fact !== 'string' || !fact.trim())) {
    throw new TypeError('place match facts must be an array of nonempty strings');
  }
  const practical = value.practical == null ? {} : value.practical;
  if (!practical || typeof practical !== 'object' || Array.isArray(practical)) {
    throw new TypeError('place match practical must be an object');
  }
  const sourceUrl = new URL(nonempty(value.sourceUrl, 'place match sourceUrl'));
  if (sourceUrl.protocol !== 'https:' || sourceUrl.username || sourceUrl.password) {
    throw new TypeError('place match sourceUrl must be a public HTTPS URL');
  }
  return {
    providerId: nonempty(value.providerId, 'place match providerId'),
    name: nonempty(value.name, 'place match name'),
    area: optionalString(value.area, 'place match area'),
    latitude,
    longitude,
    brief: optionalString(value.brief, 'place match brief'),
    practical,
    sourceUrl: sourceUrl.toString(),
    facts: facts.map(fact => fact.trim()),
  };
}

function researchEvidence({ tripId, placeId, match, retrievedAt, makeId }) {
  return {
    id: makeId('research-evidence'),
    tripId,
    placeId,
    sourceUrl: match.sourceUrl,
    retrievedAt,
    facts: match.facts,
    source: 'place_search',
    sourcePath: null,
    timestampSeconds: null,
  };
}

/**
 * Compose the extractor and shared wire adapters without choosing a database or
 * place-search vendor. `searchPlace` and `persist` are injected at the route/
 * worker boundary, keeping provider credentials and storage implementation out
 * of this reusable module.
 */
async function runInstagramImport({
  tripId,
  contributorId,
  importId,
  url,
  tripDestination,
  members = [],
  retrievedAt = new Date().toISOString(),
  extract = extractInstagram,
  searchPlace,
  persist,
  makeId = () => randomUUID(),
  allowPaidRun = false,
}) {
  nonempty(tripId, 'tripId');
  nonempty(contributorId, 'contributorId');
  nonempty(importId, 'importId');
  nonempty(url, 'url');
  nonempty(tripDestination, 'tripDestination');
  if (typeof extract !== 'function') throw new TypeError('extract must be a function');
  if (typeof searchPlace !== 'function') throw new TypeError('searchPlace must be a function');
  if (persist != null && typeof persist !== 'function') throw new TypeError('persist must be a function');
  if (!Number.isFinite(Date.parse(retrievedAt))) throw new TypeError('retrievedAt must be an ISO timestamp');

  const result = await extract(url, { allowPaidRun });
  const [{ adaptInstagramExtraction }, { createRecommendationInput }] = await Promise.all([
    import('../../../shared/utils/instagram-import.js'),
    import('../../../shared/utils/recommendation.js'),
  ]);
  const records = adaptInstagramExtraction({
    tripId, contributorId, importId, result, retrievedAt,
    makeId: (kind, index) => `${kind}-${importId}-${index + 1}`,
  });
  records.places.forEach(place => { place.tripId = tripId; });
  records.evidence.forEach(evidence => { evidence.tripId = tripId; });

  const candidateByPlaceId = new Map(records.places.map((place, index) => [place.id, result.extraction.candidates[index]]));
  const searches = [];
  const research = [];
  for (const place of records.places) {
    const candidate = candidateByPlaceId.get(place.id);
    const query = buildPlaceSearchQuery(candidate, tripDestination);
    const found = await searchPlace({ query, candidate, tripDestination });
    searches.push({ placeId: place.id, query, matched: found != null });
    if (found == null) continue;
    const match = normalizePlaceMatch(found);
    Object.assign(place, {
      name: match.name,
      identityKey: `place-search:${match.providerId}`,
      matchStatus: 'confirmed',
      area: match.area,
      latitude: match.latitude,
      longitude: match.longitude,
      brief: match.brief,
      practical: match.practical,
    });
    research.push(researchEvidence({ tripId, placeId: place.id, match, retrievedAt, makeId }));
  }

  const confirmed = records.places.filter(place => place.matchStatus === 'confirmed');
  records.import.status = confirmed.length === records.places.length && confirmed.length > 0
    ? 'ready'
    : confirmed.length > 0 ? 'partially_ready' : 'failed';
  records.import.errorCode = records.places.length === 0
    ? 'no_explicit_place'
    : confirmed.length ? null : 'place_search_failed';

  const recommendationInputs = members.length
    ? confirmed.map(place => createRecommendationInput({ place, members, evidence: research }))
    : [];
  const payload = { extraction: result, records, researchEvidence: research, searches, recommendationInputs };
  if (persist) await persist(payload);
  return payload;
}

module.exports = { buildPlaceSearchQuery, normalizePlaceMatch, runInstagramImport };
