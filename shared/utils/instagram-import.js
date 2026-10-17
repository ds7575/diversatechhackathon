import { normalizeInstagramUrl } from '../contracts/index.js';

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a nonempty string`);
  return value.trim();
}

function optionalHttpsUrl(value, name) {
  if (value == null) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new TypeError(`${name} must be a public HTTPS URL`);
  return url.toString();
}

function candidateIdentity(candidate) {
  const text = `${candidate.name}|${candidate.locationContext ?? ''}`
    .normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
  return `instagram-text:${text}`;
}

/**
 * Convert Person 2's caption-first extraction result into shared wire records.
 * All candidates remain uncertain until a separate place-matching step confirms them.
 */
export function adaptInstagramExtraction({
  tripId,
  contributorId,
  importId,
  result,
  retrievedAt,
  thumbnailUrl = null,
  makeId = (kind, index) => `${kind}-${importId}-${index + 1}`,
}) {
  required(tripId, 'tripId'); required(contributorId, 'contributorId'); required(importId, 'importId');
  required(retrievedAt, 'retrievedAt');
  if (!Number.isFinite(Date.parse(retrievedAt))) throw new TypeError('retrievedAt must be an ISO timestamp');
  if (!result || typeof result !== 'object') throw new TypeError('result must be an extraction result');
  const normalizedUrl = normalizeInstagramUrl(result.canonicalUrl ?? result.originalUrl);
  const candidates = result.extraction?.candidates;
  if (!Array.isArray(candidates)) throw new TypeError('result.extraction.candidates must be an array');
  const failed = result.status === 'failed' || (result.runStatus && result.runStatus !== 'COMPLETED');
  const importRecord = {
    id: importId,
    tripId,
    normalizedUrl,
    thumbnailUrl: optionalHttpsUrl(thumbnailUrl, 'thumbnailUrl'),
    contributorIds: [contributorId],
    status: failed ? 'failed' : 'needs_confirmation',
    errorCode: failed ? 'instagram_extraction_failed' : candidates.length ? null : 'no_explicit_place',
  };
  const places = []; const importPlaces = []; const evidence = [];
  candidates.forEach((candidate, candidateIndex) => {
    required(candidate?.name, 'candidate.name');
    const placeId = makeId('place', candidateIndex);
    required(placeId, 'placeId');
    places.push({
      id: placeId,
      tripId,
      name: candidate.name.trim(),
      identityKey: candidateIdentity(candidate),
      matchStatus: 'uncertain',
      area: candidate.locationContext?.trim() || null,
      latitude: null,
      longitude: null,
      brief: null,
      practical: {},
    });
    importPlaces.push({ importId, placeId });
    const candidateEvidence = Array.isArray(candidate.evidence) ? candidate.evidence : [];
    candidateEvidence.forEach((item, evidenceIndex) => {
      const quote = typeof item.quote === 'string' && item.quote.trim() ? item.quote.trim() : null;
      evidence.push({
        id: makeId(`evidence-${candidateIndex + 1}`, evidenceIndex),
        placeId,
        sourceUrl: optionalHttpsUrl(item.sourceUrl ?? normalizedUrl, 'evidence.sourceUrl'),
        retrievedAt,
        facts: quote ? [quote] : [],
        source: item.kind ?? 'caption',
        sourcePath: item.path ?? null,
        timestampSeconds: item.timestamp_seconds ?? null,
      });
    });
  });
  return { import: importRecord, places, importPlaces, evidence };
}
