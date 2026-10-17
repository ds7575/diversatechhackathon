import { validateTrip, validateTripBoard } from '../contracts/index.js';

function formatDay(date, startDate) {
  const number = Math.round((Date.parse(date) - Date.parse(startDate)) / 86400000) + 1;
  return `Day ${number}`;
}

function recommendationFor(placeId, recommendations) {
  return recommendations.find(item => item.placeId === placeId) ?? {
    verdict: 'needs_more_information', score: 0, headline: 'More information needed',
    text: 'This idea is still being researched.', memberEvaluations: [], evidenceStatus: 'uncertain',
  };
}

function sourceReelFor(placeId, imports, importPlaces) {
  const link = importPlaces.find(item => item.placeId === placeId);
  const source = link && imports.find(item => item.id === link.importId);
  if (!source) return null;
  return {
    importId: source.id,
    url: source.normalizedUrl,
    thumbnailUrl: source.thumbnailUrl ?? null,
    contributorIds: source.contributorIds ?? [],
  };
}

function makeCard(place, recommendation, assignment, sourceReel) {
  return {
    placeId: place.id,
    name: place.name,
    area: place.area ?? null,
    sourceReel,
    brief: place.brief ?? null,
    verdict: recommendation.verdict,
    score: recommendation.score,
    headline: recommendation.headline,
    text: recommendation.text,
    reason: assignment?.reason ?? 'Saved idea',
    manual: assignment?.manual ?? false,
  };
}

function boardGist(trip, recommendations, plannedCount) {
  const interests = recommendations
    .flatMap(item => item.memberEvaluations ?? [])
    .flatMap(item => item.matchedCriteria ?? [])
    .filter((value, index, all) => all.findIndex(item => item.toLocaleLowerCase() === value.toLocaleLowerCase()) === index)
    .slice(0, 3);
  const days = Math.round((Date.parse(trip.endDate) - Date.parse(trip.startDate)) / 86400000) + 1;
  const activityText = interests.length ? ` focused on ${interests.join(', ')}` : '';
  return `${days}-day trip with ${plannedCount} planned ${plannedCount === 1 ? 'stop' : 'stops'}${activityText}.`;
}

/** Build one denormalized payload that Person 1 can render as a masonry board. */
export function buildTripBoard({ trip, places, imports = [], importPlaces = [], recommendations = [], assignments = [] }) {
  validateTrip(trip);
  const assignmentByPlace = new Map(assignments.map(item => [item.placeId, item]));
  const dates = [];
  for (let ms = Date.parse(trip.startDate); ms <= Date.parse(trip.endDate); ms += 86400000)
    dates.push(new Date(ms).toISOString().slice(0, 10));

  const cards = places.map(place => ({
    card: makeCard(place, recommendationFor(place.id, recommendations), assignmentByPlace.get(place.id), sourceReelFor(place.id, imports, importPlaces)),
    assignment: assignmentByPlace.get(place.id),
  }));
  const days = dates.map(date => {
    const dayCards = cards.filter(item => item.assignment?.date === date)
      .sort((a, b) => a.assignment.position - b.assignment.position).map(item => item.card);
    const areas = [...new Set(dayCards.map(card => card.area).filter(Boolean))];
    return {
      date,
      label: formatDay(date, trip.startDate),
      gist: dayCards.length ? `${dayCards.length} ${dayCards.length === 1 ? 'stop' : 'stops'}${areas.length ? ` around ${areas.join(' and ')}` : ''}` : 'Open day — add ideas from the board',
      cards: dayCards,
    };
  });
  const ideas = cards.filter(item => !item.assignment || item.assignment.date === null).map(item => item.card);
  const plannedCount = days.reduce((total, day) => total + day.cards.length, 0);
  const board = {
    tripId: trip.id,
    title: trip.name,
    destination: trip.destination,
    dateRange: { startDate: trip.startDate, endDate: trip.endDate },
    gist: boardGist(trip, recommendations, plannedCount),
    days,
    ideas,
  };
  return validateTripBoard(board, trip, places);
}
