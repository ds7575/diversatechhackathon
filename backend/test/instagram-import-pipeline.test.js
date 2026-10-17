const test = require('node:test');
const assert = require('node:assert/strict');
const { buildPlaceSearchQuery, runInstagramImport } = require('../src/services/instagram-import-pipeline');

const REEL_URL = 'https://www.instagram.com/p/C3FbgOCovaz/';
const extraction = {
  originalUrl: REEL_URL,
  canonicalUrl: REEL_URL,
  status: 'completed',
  runStatus: 'COMPLETED',
  extraction: {
    candidates: [{
      name: 'Cala Mitjana', locationContext: 'Menorca, Spain', uncertain: true,
      evidence: [{ sourceUrl: REEL_URL, kind: 'caption', path: 'caption', timestamp_seconds: null, quote: '📍Cala Mitjana, Menorca, Spain' }],
    }],
  },
};

test('buildPlaceSearchQuery retains explicit text and trip destination', () => {
  assert.equal(buildPlaceSearchQuery(extraction.extraction.candidates[0], 'Menorca'), 'Cala Mitjana, Menorca, Spain, Menorca');
});

test('pipeline creates schema-shaped records, verifies one place, and isolates research for AI input', async () => {
  let persisted;
  const output = await runInstagramImport({
    tripId: 'trip-1', contributorId: 'member-1', importId: 'import-1', url: REEL_URL,
    tripDestination: 'Menorca', retrievedAt: '2026-10-17T00:00:00.000Z',
    extract: async () => extraction,
    searchPlace: async ({ query }) => {
      assert.equal(query, 'Cala Mitjana, Menorca, Spain, Menorca');
      return {
        providerId: 'google:ChIJ-example', name: 'Cala Mitjana', area: 'Menorca',
        latitude: 39.943, longitude: 4.055, brief: 'Beach cove.', practical: { type: 'beach' },
        sourceUrl: 'https://maps.google.com/?cid=example', facts: ['A beach cove on Menorca.'],
      };
    },
    members: [{ id: 'member-1', displayName: 'Ada', preferences: { interests: ['beaches'] }, firmLimits: {} }],
    persist: async payload => { persisted = payload; },
    makeId: kind => `id-${kind}`,
  });
  assert.equal(output.records.import.status, 'ready');
  assert.equal(output.records.places[0].matchStatus, 'confirmed');
  assert.equal(output.records.places[0].identityKey, 'place-search:google:ChIJ-example');
  assert.equal(output.records.evidence[0].source, 'caption');
  assert.deepEqual(output.researchEvidence[0].facts, ['A beach cove on Menorca.']);
  assert.deepEqual(output.recommendationInputs[0].evidence, [{
    facts: ['A beach cove on Menorca.'], sourceUrl: 'https://maps.google.com/?cid=example', retrievedAt: '2026-10-17T00:00:00.000Z',
  }]);
  assert.equal(JSON.stringify(output).includes('comment'), false);
  assert.equal(persisted, output);
});

test('pipeline retains the Reel evidence and fails cleanly when place search finds nothing', async () => {
  const output = await runInstagramImport({
    tripId: 'trip-1', contributorId: 'member-1', importId: 'import-2', url: REEL_URL,
    tripDestination: 'Menorca', retrievedAt: '2026-10-17T00:00:00.000Z',
    extract: async () => extraction, searchPlace: async () => null,
  });
  assert.equal(output.records.import.status, 'failed');
  assert.equal(output.records.import.errorCode, 'place_search_failed');
  assert.equal(output.records.places[0].matchStatus, 'uncertain');
  assert.equal(output.records.evidence[0].facts[0], '📍Cala Mitjana, Menorca, Spain');
  assert.deepEqual(output.researchEvidence, []);
});
