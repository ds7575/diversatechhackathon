const EARTH_RADIUS_KM = 6371.0088;

function coordinate(value, low, high, name) {
  if (!Number.isFinite(value) || value < low || value > high) throw new TypeError(`${name} is out of range`);
  return value;
}

export function hasCoordinates(place) {
  return Number.isFinite(place?.latitude) && Number.isFinite(place?.longitude) &&
    place.latitude >= -90 && place.latitude <= 90 && place.longitude >= -180 && place.longitude <= 180;
}

/** Great-circle distance. Routing providers may later replace this for travel time. */
export function distanceKm(a, b) {
  const lat1 = coordinate(a?.latitude, -90, 90, 'latitude');
  const lon1 = coordinate(a?.longitude, -180, 180, 'longitude');
  const lat2 = coordinate(b?.latitude, -90, 90, 'latitude');
  const lon2 = coordinate(b?.longitude, -180, 180, 'longitude');
  const radians = degrees => degrees * Math.PI / 180;
  const dLat = radians(lat2 - lat1); const dLon = radians(lon2 - lon1);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Deterministic nearest-neighbor ordering; non-geocoded places remain at the end. */
export function orderByProximity(places, start = null) {
  const remaining = places.slice(); const ordered = [];
  let current = hasCoordinates(start) ? start : null;
  while (remaining.length) {
    let index = 0;
    if (current) {
      index = remaining.reduce((best, place, candidateIndex) => {
        if (!hasCoordinates(place)) return best;
        if (!hasCoordinates(remaining[best])) return candidateIndex;
        const candidateDistance = distanceKm(current, place);
        const bestDistance = distanceKm(current, remaining[best]);
        return candidateDistance < bestDistance || (candidateDistance === bestDistance && place.id.localeCompare(remaining[best].id) < 0)
          ? candidateIndex : best;
      }, 0);
    } else {
      index = remaining.reduce((best, place, candidateIndex) => place.id.localeCompare(remaining[best].id) < 0 ? candidateIndex : best, 0);
    }
    const [next] = remaining.splice(index, 1); ordered.push(next);
    if (hasCoordinates(next)) current = next;
  }
  return ordered;
}
