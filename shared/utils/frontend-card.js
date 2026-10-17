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
