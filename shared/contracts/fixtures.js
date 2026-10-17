/** Synthetic integration fixture; these are not researched travel recommendations. */
export const demoSnapshot = {
  trip: { id: 'trip-1', name: 'Demo trip', destination: 'Demo City', startDate: '2026-11-01', endDate: '2026-11-02', preferences: {} },
  members: [
    { id: 'a', tripId: 'trip-1', displayName: 'Member a', preferences: { interests: ['museums'], budgetLevel: 'moderate', activityLevel: 'medium', crowdPreference: 'neutral', maxTravelMinutes: 30 }, firmLimits: {} },
    { id: 'b', tripId: 'trip-1', displayName: 'Member b', preferences: { interests: ['culture'], budgetLevel: 'budget', activityLevel: 'low', crowdPreference: 'avoid', maxTravelMinutes: 20 }, firmLimits: {} },
    { id: 'c', tripId: 'trip-1', displayName: 'Member c', preferences: { interests: ['indoor activities'], budgetLevel: 'premium', activityLevel: 'medium', crowdPreference: 'neutral', maxTravelMinutes: 45 }, firmLimits: { accessibilityRequired: true } },
  ],
  imports: [{ id: 'import-1', tripId: 'trip-1', normalizedUrl: 'https://www.instagram.com/reel/DEMO/', thumbnailUrl: 'https://images.example/reel-demo.jpg', contributorIds: ['a', 'b'], status: 'partially_ready', errorCode: null }],
  places: [
    { id: 'place-1', tripId: 'trip-1', name: 'Demo museum', matchStatus: 'confirmed', area: 'Central', latitude: null, longitude: null, brief: null, practical: {} },
    { id: 'place-2', tripId: 'trip-1', name: 'Possible demo cafe', matchStatus: 'uncertain', area: null, latitude: null, longitude: null, brief: null, practical: {} },
  ],
  importPlaces: [{ importId: 'import-1', placeId: 'place-1' }, { importId: 'import-1', placeId: 'place-2' }],
  evidence: [], reactions: [{ placeId: 'place-1', memberId: 'a', value: 'interested' }],
  concerns: [{ id: 'concern-1', placeId: 'place-1', memberId: 'b', kind: 'price', note: 'Discuss cost' }],
  recommendations: [{
    placeId: 'place-1', verdict: 'recommended', score: 78,
    headline: 'Recommended for your group',
    text: "It matches Member a's interest in museums; Member b's interest in culture; Member c's interest in indoor activities, but may be outside Member b's budget.",
    evidenceStatus: 'confirmed',
    memberEvaluations: [
      { memberId: 'a', fit: 'strong', matchedCriteria: ['museums'], conflicts: [] },
      { memberId: 'b', fit: 'mixed', matchedCriteria: ['culture'], conflicts: ['price'] },
      { memberId: 'c', fit: 'good', matchedCriteria: ['indoor activities'], conflicts: [] },
    ],
  }],
  assignments: [], planRevision: 0,
};

/** Synthetic Lisbon fixture for end-to-end integration; facts are demo copy, not travel research. */
export const lisbonSnapshot = {
  trip: { id: 'lisbon-trip', name: 'Lisbon with friends', destination: 'Lisbon', startDate: '2026-06-12', endDate: '2026-06-14', baseArea: 'Baixa', transport: 'Transit and walking', budget: 'Moderate', preferences: {} },
  members: [
    { id: 'maya', tripId: 'lisbon-trip', displayName: 'Maya', preferences: { interests: ['local food', 'markets'], budgetLevel: 'moderate', activityLevel: 'medium', crowdPreference: 'neutral', maxTravelMinutes: 35 }, firmLimits: {} },
    { id: 'dev', tripId: 'lisbon-trip', displayName: 'Dev', preferences: { interests: ['local food', 'architecture'], budgetLevel: 'budget', activityLevel: 'medium', crowdPreference: 'avoid', maxTravelMinutes: 30 }, firmLimits: {} },
    { id: 'sam', tripId: 'lisbon-trip', displayName: 'Sam', preferences: { interests: ['views', 'history'], budgetLevel: 'moderate', activityLevel: 'low', crowdPreference: 'neutral', maxTravelMinutes: 25 }, firmLimits: { accessibilityRequired: true } },
  ],
  imports: [
    { id: 'reel-market', tripId: 'lisbon-trip', normalizedUrl: 'https://www.instagram.com/reel/LISBONMARKET/', thumbnailUrl: 'https://images.example/lisbon-market.jpg', contributorIds: ['maya', 'dev'], status: 'ready', errorCode: null },
    { id: 'reel-belem', tripId: 'lisbon-trip', normalizedUrl: 'https://www.instagram.com/reel/LISBONBELEM/', thumbnailUrl: 'https://images.example/belem.jpg', contributorIds: ['dev'], status: 'ready', errorCode: null },
    { id: 'reel-view', tripId: 'lisbon-trip', normalizedUrl: 'https://www.instagram.com/reel/LISBONVIEW/', thumbnailUrl: 'https://images.example/lisbon-view.jpg', contributorIds: ['sam'], status: 'needs_confirmation', errorCode: null },
  ],
  places: [
    { id: 'time-out-market', tripId: 'lisbon-trip', name: 'Time Out Market Lisboa', matchStatus: 'confirmed', area: 'Cais do Sodré', latitude: null, longitude: null, brief: 'Food hall with stalls from a range of local chefs.', practical: { cost: 'EUR 20 pp', caveats: ['Busy at peak meal times'] } },
    { id: 'pasteis-belem', tripId: 'lisbon-trip', name: 'Pastéis de Belém', matchStatus: 'confirmed', area: 'Belém', latitude: null, longitude: null, brief: 'Historic bakery known for Portuguese custard tarts.', practical: { cost: 'EUR 10 pp', caveats: ['Queues are common'] } },
    { id: 'miradouro', tripId: 'lisbon-trip', name: 'Possible Alfama viewpoint', matchStatus: 'uncertain', area: 'Alfama', latitude: null, longitude: null, brief: 'A viewpoint mentioned in a Reel that still needs confirmation.', practical: { priceText: 'Cost unknown', caveats: ['Steep approach may require extra effort'] } },
  ],
  importPlaces: [
    { importId: 'reel-market', placeId: 'time-out-market' },
    { importId: 'reel-belem', placeId: 'pasteis-belem' },
    { importId: 'reel-view', placeId: 'miradouro' },
  ],
  evidence: [],
  reactions: [
    { placeId: 'time-out-market', memberId: 'maya', value: 'interested' },
    { placeId: 'time-out-market', memberId: 'dev', value: 'interested' },
    { placeId: 'pasteis-belem', memberId: 'maya', value: 'interested' },
  ],
  concerns: [
    { id: 'lisbon-concern-1', placeId: 'time-out-market', memberId: 'dev', kind: 'price', note: 'May be above my meal budget' },
    { id: 'lisbon-concern-2', placeId: 'miradouro', memberId: 'sam', kind: 'effort', note: 'The steep route may be difficult' },
  ],
  recommendations: [], assignments: [], planRevision: 0,
};
