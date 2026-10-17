const MODES = new Set(['walk', 'transit', 'car']);

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a nonempty string`);
}

export function validateTravelTimes(routes, placeIds = null) {
  if (!Array.isArray(routes)) throw new TypeError('travelTimes must be an array');
  const allowed = placeIds == null ? null : new Set(placeIds); const seen = new Set();
  for (const route of routes) {
    required(route?.originPlaceId, 'originPlaceId'); required(route?.destinationPlaceId, 'destinationPlaceId');
    if (route.originPlaceId === route.destinationPlaceId) throw new TypeError('A travel-time route must connect two different places');
    if (allowed && (!allowed.has(route.originPlaceId) || !allowed.has(route.destinationPlaceId))) throw new TypeError('Travel-time route references an unknown place');
    if (!Number.isFinite(route.minutes) || route.minutes < 0) throw new TypeError('Travel time must be a nonnegative number of minutes');
    if (route.distanceKm != null && (!Number.isFinite(route.distanceKm) || route.distanceKm < 0)) throw new TypeError('Travel distance must be nonnegative');
    if (!MODES.has(route.mode)) throw new TypeError('Travel mode must be walk, transit, or car');
    const key = `${route.originPlaceId}\u0000${route.destinationPlaceId}\u0000${route.mode}`;
    if (seen.has(key)) throw new TypeError('Travel-time routes must be unique by origin, destination, and mode');
    seen.add(key);
  }
  return routes;
}

export function createTravelTimeLookup(routes, { mode = null } = {}) {
  validateTravelTimes(routes);
  if (mode !== null && !MODES.has(mode)) throw new TypeError('Travel mode must be walk, transit, car, or null');
  const lookup = new Map();
  for (const route of routes.filter(item => mode === null || item.mode === mode)) {
    const key = `${route.originPlaceId}\u0000${route.destinationPlaceId}`;
    const existing = lookup.get(key);
    if (!existing || route.minutes < existing.minutes) lookup.set(key, route);
  }
  return {
    get(originPlaceId, destinationPlaceId) {
      return lookup.get(`${originPlaceId}\u0000${destinationPlaceId}`) ?? null;
    },
  };
}

/** Deterministic nearest-neighbor order using provider travel minutes when present. */
export function orderByTravelTime(places, travelTimes, { startPlaceId = null, mode = null } = {}) {
  validateTravelTimes(travelTimes);
  if (new Set(places.map(place => place.id)).size !== places.length) throw new TypeError('Places must have unique IDs');
  const lookup = createTravelTimeLookup(travelTimes, { mode });
  const remaining = places.slice(); const ordered = [];
  let currentId = startPlaceId;
  while (remaining.length) {
    let index = remaining.reduce((best, place, candidateIndex) => place.id.localeCompare(remaining[best].id) < 0 ? candidateIndex : best, 0);
    if (currentId) {
      const reachable = remaining.map((place, candidateIndex) => ({ candidateIndex, place, route: lookup.get(currentId, place.id) }))
        .filter(item => item.route)
        .sort((a, b) => a.route.minutes - b.route.minutes || a.place.id.localeCompare(b.place.id));
      if (reachable.length) index = reachable[0].candidateIndex;
    }
    const [next] = remaining.splice(index, 1); ordered.push(next); currentId = next.id;
  }
  return ordered;
}

export const TRAVEL_MODES = Object.freeze([...MODES]);
