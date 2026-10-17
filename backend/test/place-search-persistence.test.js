const test = require('node:test');
const assert = require('node:assert/strict');
const { createCachedPlaceSearch } = require('../src/services/place-search');
const { createSQLiteImportStore } = require('../src/services/sqlite-import-store');
const { runInstagramImport } = require('../src/services/instagram-import-pipeline');

const URL = 'https://www.instagram.com/p/C3FbgOCovaz/';
const result = {
  originalUrl: URL, canonicalUrl: URL, status: 'completed', runStatus: 'COMPLETED',
  extraction: { candidates: [{ name: 'Girona', locationContext: 'Spain', evidence: [{ sourceUrl: URL, kind: 'caption', path: 'caption', quote: 'city of Girona' }] }] },
};

test('cached place search coalesces duplicate concurrent requests', async () => {
  let calls = 0;
  const searchPlace = createCachedPlaceSearch({ search: async () => { calls += 1; return { providerId: 'x' }; } });
  const request = { query: 'Girona, Spain', candidate: { name: 'Girona' }, tripDestination: 'Spain' };
  const [first, second] = await Promise.all([searchPlace(request), searchPlace({ ...request, query: ' girona,  SPAIN ' })]);
  assert.deepEqual(first, { providerId: 'x' }); assert.deepEqual(second, { providerId: 'x' }); assert.equal(calls, 1);
});

test('SQLite store persists confirmed places and both kinds of evidence atomically', async t => {
  const store = await createSQLiteImportStore();
  t.after(() => store.close());
  const db = store.database;
  db.prepare(`INSERT INTO trips (id,name,destination,start_date,end_date,created_at) VALUES (?,?,?,?,?,?)`)
    .run('trip-1', 'Spain', 'Spain', '2026-10-20', '2026-10-22', '2026-10-17T00:00:00.000Z');
  db.prepare(`INSERT INTO members (id,trip_id,subject_id,display_name) VALUES (?,?,?,?)`).run('member-1', 'trip-1', 'subject-1', 'Ada');
  const searchPlace = createCachedPlaceSearch({ search: async () => ({
    providerId: 'google:girona', name: 'Girona', area: 'Catalonia, Spain', latitude: 41.9794, longitude: 2.8214,
    brief: 'A city in Catalonia.', practical: { category: 'city' }, sourceUrl: 'https://maps.google.com/?cid=girona', facts: ['Girona is in Catalonia.'],
  }) });
  await runInstagramImport({
    tripId: 'trip-1', contributorId: 'member-1', importId: 'import-1', url: URL, tripDestination: 'Spain',
    retrievedAt: '2026-10-17T00:00:00.000Z', extract: async () => result, searchPlace,
    persist: payload => store.persist(payload),
  });
  assert.deepEqual({ ...db.prepare('SELECT status, error_code FROM imports').get() }, { status: 'ready', error_code: null });
  assert.deepEqual({ ...db.prepare('SELECT name, identity_key, match_status FROM places').get() }, { name: 'Girona', identity_key: 'place-search:google:girona', match_status: 'confirmed' });
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM import_places').get().count, 1);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM evidence').get().count, 2);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM import_contributors').get().count, 1);
});
