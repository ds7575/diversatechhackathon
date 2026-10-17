const LABELS = Object.freeze({
  strong_match: 'strong',
  recommended: 'strong',
  mixed_fit: 'discuss',
  not_recommended: 'discuss',
  needs_more_information: 'needs_info',
});

function countBy(items, key, value) {
  return items.filter(item => item[key] === value).length;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

/**
 * Adapt a shared trip-board card to Person 1's BoardingPassCard props.
 * thumbnailUrl is intentionally additive until the UI renders Reel imagery.
 */
export function toBoardingPassCard({ card, members, reactions = [], concerns = [], currentMemberId = null }) {
  if (!card?.placeId || !card.name) throw new TypeError('A trip-board card is required');
  const memberNames = new Map(members.map(member => [member.id, member.displayName]));
  const placeReactions = reactions.filter(item => item.placeId === card.placeId);
  const placeConcerns = concerns.filter(item => item.placeId === card.placeId);
  const source = card.sourceReel;
  const contributors = unique((source?.contributorIds ?? []).map(id => memberNames.get(id) ?? 'Trip member'));
  const practicalCaveats = Array.isArray(card.practical?.caveats) ? card.practical.caveats : [];
  const concernCaveats = placeConcerns.map(item => item.note?.trim() || `${item.kind} concern`);
  const myReaction = placeReactions.find(item => item.memberId === currentMemberId)?.value ?? null;
  const myConcern = placeConcerns.find(item => item.memberId === currentMemberId)?.kind ?? null;
  return {
    name: card.name,
    summary: card.brief ?? card.headline,
    location: card.area ?? 'Location unknown',
    cost: card.practical?.cost ?? card.practical?.priceText ?? 'Cost unknown',
    caveats: unique([...practicalCaveats, ...concernCaveats]).slice(0, 3),
    label: LABELS[card.verdict] ?? 'needs_info',
    reason: card.text,
    contributors,
    reelUrl: source?.url ?? '',
    thumbnailUrl: source?.thumbnailUrl ?? null,
    counts: {
      interested: countBy(placeReactions, 'value', 'interested'),
      pass: countBy(placeReactions, 'value', 'pass'),
      price: countBy(placeConcerns, 'kind', 'price'),
      distance: countBy(placeConcerns, 'kind', 'distance'),
      effort: countBy(placeConcerns, 'kind', 'effort'),
    },
    mine: myReaction ?? myConcern,
  };
}

/** Attach render-ready cards while preserving the board's day/idea structure. */
export function toFrontendTripBoard(board, context) {
  const adapt = card => ({ ...card, boardingPass: toBoardingPassCard({ card, ...context }) });
  return {
    ...board,
    days: board.days.map(day => ({ ...day, cards: day.cards.map(adapt) })),
    ideas: board.ideas.map(adapt),
  };
}

/** Exact place shape currently consumed by frontend/src/lib/types.ts. */
export function toFrontendPlace({ card, day = null, ...context }) {
  if (day !== null && (!Number.isInteger(day) || day < 1)) throw new TypeError('day must be null or a positive integer');
  const { thumbnailUrl: _thumbnailUrl, ...boardingPass } = toBoardingPassCard({ card, ...context });
  return {
    id: card.placeId,
    ...boardingPass,
    status: card.matchStatus === 'confirmed' ? 'ready' : 'needs_confirmation',
    day,
  };
}

/** Adapt the shared date-based board to the frontend's numeric day itinerary. */
export function toFrontendItinerary(board, context, { generated } = {}) {
  if (!board || !Array.isArray(board.days) || !Array.isArray(board.ideas)) throw new TypeError('A trip board is required');
  const days = board.days.map((item, index) => ({ day: index + 1, explanation: item.gist }));
  const planned = board.days.flatMap((item, index) => item.cards.map(card => ({ card, day: index + 1 })));
  const standby = board.ideas.map(card => ({ card, day: null }));
  const places = [...planned, ...standby]
    .filter(item => item.card.matchStatus === 'confirmed')
    .map(item => toFrontendPlace({ card: item.card, day: item.day, ...context }));
  return {
    generated: generated ?? planned.length > 0,
    days,
    places,
  };
}

const reelStatus = status => ['queued', 'processing'].includes(status) ? 'processing'
  : status === 'failed' ? 'failed' : 'ready';

/** Build the nested Reel payload used by the current Ideas screen. */
export function toFrontendReels(snapshot, context) {
  const board = snapshot.board ?? snapshot;
  const cards = [...(board.days ?? []).flatMap(day => day.cards), ...(board.ideas ?? [])];
  const cardByPlace = new Map(cards.map(card => [card.placeId, card]));
  const dayByPlace = new Map((board.days ?? []).flatMap((day, index) => day.cards.map(card => [card.placeId, index + 1])));
  return (snapshot.imports ?? []).map(imported => {
    const links = (snapshot.importPlaces ?? []).filter(link => link.importId === imported.id);
    const sourceReel = {
      importId: imported.id,
      url: imported.normalizedUrl,
      thumbnailUrl: imported.thumbnailUrl ?? null,
      contributorIds: imported.contributorIds ?? [],
    };
    return {
      id: imported.id,
      url: imported.normalizedUrl,
      status: reelStatus(imported.status),
      places: links.map(link => cardByPlace.get(link.placeId)).filter(Boolean).map(card =>
        toFrontendPlace({ card: { ...card, sourceReel }, day: dayByPlace.get(card.placeId) ?? null, ...context })),
    };
  });
}
