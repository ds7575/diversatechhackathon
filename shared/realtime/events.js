export const TRIP_EVENT_TYPES = Object.freeze([
  'import.upserted', 'place.upserted', 'recommendation.upserted',
  'reaction.upserted', 'reaction.deleted', 'concern.upserted', 'concern.deleted',
  'assignments.replaced',
]);

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a nonempty string`);
}

export function validateTripEvent(event) {
  if (!event || typeof event !== 'object' || !TRIP_EVENT_TYPES.includes(event.type)) throw new TypeError('Invalid trip event type');
  required(event.tripId, 'tripId');
  if (event.type === 'assignments.replaced') {
    if (!Array.isArray(event.assignments) || !Number.isInteger(event.planRevision) || event.planRevision < 0)
      throw new TypeError('Assignment event requires assignments and a nonnegative planRevision');
  } else if (event.type.endsWith('.deleted')) required(event.id, 'event.id');
  else {
    if (!event.record || typeof event.record !== 'object') throw new TypeError('Upsert event requires a record');
    required(event.record.tripId, 'record.tripId');
  }
  return event;
}

function upsert(items, record, key) {
  const index = items.findIndex(item => key(item) === key(record));
  return index < 0 ? [...items, record] : items.map((item, itemIndex) => itemIndex === index ? record : item);
}

/** Apply one authorized Realtime event without mutating the current snapshot. */
export function applyTripEvent(snapshot, rawEvent) {
  const event = validateTripEvent(rawEvent);
  if (snapshot.trip.id !== event.tripId) throw new TypeError('Cross-trip event rejected');
  if (event.record?.tripId !== undefined && event.record.tripId !== event.tripId) throw new TypeError('Cross-trip record rejected');
  if (event.type === 'assignments.replaced') {
    if (event.planRevision <= snapshot.planRevision) return snapshot;
    return { ...snapshot, assignments: event.assignments.map(item => ({ ...item })), planRevision: event.planRevision };
  }
  const next = { ...snapshot };
  if (event.type === 'import.upserted') next.imports = upsert(snapshot.imports, event.record, item => item.id);
  if (event.type === 'place.upserted') next.places = upsert(snapshot.places, event.record, item => item.id);
  if (event.type === 'recommendation.upserted') next.recommendations = upsert(snapshot.recommendations, event.record, item => item.placeId);
  if (event.type === 'reaction.upserted') next.reactions = upsert(snapshot.reactions, event.record, item => `${item.placeId}:${item.memberId}`);
  if (event.type === 'reaction.deleted') next.reactions = snapshot.reactions.filter(item => `${item.placeId}:${item.memberId}` !== event.id);
  if (event.type === 'concern.upserted') next.concerns = upsert(snapshot.concerns, event.record, item => item.id);
  if (event.type === 'concern.deleted') next.concerns = snapshot.concerns.filter(item => item.id !== event.id);
  return next;
}
