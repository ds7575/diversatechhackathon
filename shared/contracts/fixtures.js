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
