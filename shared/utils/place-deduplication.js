import { distanceKm, hasCoordinates } from './geo.js';

function text(value) {
  return String(value ?? '').normalize('NFKD').replace(/\p{M}/gu, '')
    .toLocaleLowerCase().replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function strongIdentity(place) {
  return typeof place.identityKey === 'string' && place.identityKey && !place.identityKey.startsWith('instagram-text:')
    ? place.identityKey : null;
}

function samePlace(a, b, maxDistanceKm) {
  if (a.tripId !== b.tripId) return false;
  const aIdentity = strongIdentity(a); const bIdentity = strongIdentity(b);
  if (aIdentity && bIdentity) return aIdentity === bIdentity;
  if (!text(a.name) || text(a.name) !== text(b.name)) return false;
  const aArea = text(a.area); const bArea = text(b.area);
  if (aArea && bArea && aArea === bArea) return true;
  if (hasCoordinates(a) && hasCoordinates(b)) return distanceKm(a, b) <= maxDistanceKm;
  return !aArea || !bArea;
}

function richer(current, incoming) {
  if (current == null || current === '') return incoming;
  if (incoming == null || incoming === '') return current;
  return String(incoming).length > String(current).length ? incoming : current;
}

function mergePlace(current, incoming) {
  const incomingConfirmed = incoming.matchStatus === 'confirmed' && current.matchStatus !== 'confirmed';
  const preferred = incomingConfirmed ? incoming : current;
  const other = incomingConfirmed ? current : incoming;
  const caveats = [...new Set([...(current.practical?.caveats ?? []), ...(incoming.practical?.caveats ?? [])])];
  return {
    ...other,
    ...preferred,
    id: current.id,
    tripId: current.tripId,
    name: richer(preferred.name, other.name),
    identityKey: strongIdentity(preferred) ?? strongIdentity(other) ?? preferred.identityKey ?? other.identityKey,
    matchStatus: current.matchStatus === 'confirmed' || incoming.matchStatus === 'confirmed' ? 'confirmed' : 'uncertain',
    area: richer(preferred.area, other.area),
    latitude: preferred.latitude ?? other.latitude ?? null,
    longitude: preferred.longitude ?? other.longitude ?? null,
    brief: richer(preferred.brief, other.brief),
    practical: {
      ...(other.practical ?? {}),
      ...(preferred.practical ?? {}),
      ...(caveats.length ? { caveats } : {}),
    },
  };
}

/**
 * Merge the same real-world place across multiple Reels without mutating input.
 * Provider identities win; otherwise normalized name plus area/coordinates is used.
 */
export function deduplicatePlaceRecords({ places, importPlaces = [], evidence = [] }, { maxDistanceKm = 0.25 } = {}) {
  if (!Array.isArray(places) || !Array.isArray(importPlaces) || !Array.isArray(evidence)) throw new TypeError('places, importPlaces, and evidence must be arrays');
  if (!Number.isFinite(maxDistanceKm) || maxDistanceKm <= 0) throw new RangeError('maxDistanceKm must be positive');
  if (new Set(places.map(place => place.id)).size !== places.length) throw new TypeError('Place IDs must be unique before deduplication');
  const placeIds = new Set(places.map(place => place.id));
  if (importPlaces.some(link => !placeIds.has(link.placeId)) || evidence.some(item => !placeIds.has(item.placeId))) {
    throw new TypeError('Import links and evidence must reference known places');
  }

  const merged = []; const aliases = {};
  for (const original of places) {
    const place = structuredClone(original);
    const index = merged.findIndex(candidate => samePlace(candidate, place, maxDistanceKm));
    if (index < 0) merged.push(place);
    else {
      aliases[place.id] = merged[index].id;
      merged[index] = mergePlace(merged[index], place);
    }
  }
  const canonicalId = placeId => aliases[placeId] ?? placeId;
  const seenLinks = new Set();
  const links = importPlaces.map(link => ({ ...link, placeId: canonicalId(link.placeId) })).filter(link => {
    const key = `${link.importId}:${link.placeId}`;
    if (seenLinks.has(key)) return false;
    seenLinks.add(key); return true;
  });
  return {
    places: merged,
    importPlaces: links,
    evidence: evidence.map(item => ({ ...item, placeId: canonicalId(item.placeId) })),
    aliases,
  };
}
