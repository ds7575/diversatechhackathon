import { validateTrip, validateAssignments } from '../contracts/index.js';
import { distanceKm, hasCoordinates, orderByProximity } from './geo.js';
/** Deterministic rough buckets, not routing. Existing manual assignments (including removals)
 * survive regeneration unless replaceManual is explicitly true. Concerns do not veto ideas.
 * Backend derives excludedPlaceIds from firm limits; ordinary Pass votes only affect rank.
 */
export function generateItinerary({ trip, places, reactions = [], assignments = [], excludedPlaceIds = [], replaceManual = false, maxPerDay = 3, maxClusterKm = 10 }) {
  validateTrip(trip);
  if (!Number.isInteger(maxPerDay) || maxPerDay < 1) throw new RangeError('maxPerDay must be a positive integer');
  if (!Number.isFinite(maxClusterKm) || maxClusterKm <= 0) throw new RangeError('maxClusterKm must be positive');
  if (typeof replaceManual !== 'boolean') throw new TypeError('replaceManual must be boolean');
  if (new Set(places.map(p => p.id)).size !== places.length || places.some(p => p.tripId !== trip.id || !['confirmed', 'uncertain'].includes(p.matchStatus)))
    throw new TypeError('Places must have unique IDs, belong to this trip, and have a valid match status');
  const dates = [];
  for (let ms = Date.parse(trip.startDate); ms <= Date.parse(trip.endDate); ms += 86400000) dates.push(new Date(ms).toISOString().slice(0, 10));
  const excluded = new Set(excludedPlaceIds); const output = []; const locked = new Set();
  for (const a of assignments.filter(a => a.manual && !replaceManual)) {
    if (!places.some(p => p.id === a.placeId)) throw new TypeError('Stale manual assignment; resolve before regeneration');
    output.push({ ...a }); locked.add(a.placeId);
  }
  const score = id => reactions.filter(r => r.placeId === id).reduce((n, r) => n + (r.value === 'interested' ? 1 : r.value === 'pass' ? -1 : 0), 0);
  const sorted = places.filter(p => !locked.has(p.id)).slice().sort((a, b) => score(b.id) - score(a.id) || String(a.area ?? '').localeCompare(String(b.area ?? '')) || a.id.localeCompare(b.id));
  const add = (place, date, reason) => {
    const positions = output.filter(a => a.date === date).map(a => a.position);
    output.push({ placeId: place.id, date, position: positions.length ? Math.max(...positions) + 1 : 0, manual: false, reason });
  };
  for (const place of sorted) {
    if (place.matchStatus !== 'confirmed' || excluded.has(place.id)) {
      add(place, null, place.matchStatus !== 'confirmed' ? 'Needs confirmation' : 'Excluded by a firm limit'); continue;
    }
    const available = dates.filter(date => output.filter(a => a.date === date).length < maxPerDay);
    const distances = available.map(date => {
      const peers = output.filter(a => a.date === date).map(a => places.find(p => p.id === a.placeId)).filter(hasCoordinates);
      return { date, distance: hasCoordinates(place) && peers.length ? Math.min(...peers.map(peer => distanceKm(place, peer))) : null };
    });
    const closest = distances.filter(item => item.distance !== null).sort((a, b) => a.distance - b.distance || a.date.localeCompare(b.date))[0];
    const empty = available.find(date => !output.some(a => a.date === date));
    const sameArea = available.find(date => place.area && output.some(a => a.date === date && places.find(p => p.id === a.placeId)?.area === place.area));
    const useClosest = closest && (closest.distance <= maxClusterKm || !empty);
    const date = useClosest ? closest.date : sameArea ?? empty ?? available[0] ?? null;
    const reason = date === null ? 'No remaining day capacity'
      : useClosest ? `Grouped within ${closest.distance.toFixed(1)} km of another stop`
        : sameArea ? `Grouped in ${place.area}` : 'Fits available day capacity';
    add(place, date, reason);
  }
  for (const date of dates) {
    const dayAssignments = output.filter(a => a.date === date);
    if (!dayAssignments.length || dayAssignments.some(a => a.manual)) continue;
    const dayPlaces = dayAssignments.map(a => places.find(p => p.id === a.placeId));
    const ordered = orderByProximity(dayPlaces);
    ordered.forEach((place, position) => { output.find(a => a.placeId === place.id).position = position; });
  }
  return validateAssignments(output, places, trip);
}
