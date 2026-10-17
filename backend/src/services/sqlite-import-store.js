const { DatabaseSync } = require('node:sqlite');

function json(value) { return JSON.stringify(value ?? {}); }

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a nonempty string`);
  return value;
}

class SQLiteImportStore {
  constructor(database) {
    this.database = database;
  }

  /** Persist one complete worker result atomically against shared/database/schema.js. */
  persist({ records, researchEvidence = [] }) {
    if (!records?.import || !Array.isArray(records.places) || !Array.isArray(records.importPlaces) || !Array.isArray(records.evidence)) {
      throw new TypeError('records must contain import, places, importPlaces, and evidence');
    }
    const importedAt = new Date().toISOString();
    const { import: imported } = records;
    required(imported.id, 'import.id'); required(imported.tripId, 'import.tripId');
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.prepare(`INSERT INTO imports (id, trip_id, normalized_url, status, thumbnail_url, error_code, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(trip_id, normalized_url) DO UPDATE SET status=excluded.status, thumbnail_url=excluded.thumbnail_url, error_code=excluded.error_code`)
        .run(imported.id, imported.tripId, imported.normalizedUrl, imported.status, imported.thumbnailUrl, imported.errorCode, importedAt);
      for (const contributorId of imported.contributorIds) {
        this.database.prepare('INSERT OR IGNORE INTO import_contributors (trip_id, import_id, member_id) VALUES (?, ?, ?)')
          .run(imported.tripId, imported.id, contributorId);
      }

      const placeIds = new Map();
      for (const place of records.places) {
        const existing = this.database.prepare('SELECT id FROM places WHERE trip_id = ? AND identity_key = ?')
          .get(place.tripId, place.identityKey);
        const placeId = existing?.id || place.id;
        if (existing) {
          this.database.prepare(`UPDATE places SET name=?, match_status=?, area=?, latitude=?, longitude=?, brief=?, practical_json=?
            WHERE id=? AND trip_id=?`).run(place.name, place.matchStatus, place.area, place.latitude, place.longitude, place.brief, json(place.practical), placeId, place.tripId);
        } else {
          this.database.prepare(`INSERT INTO places (id, trip_id, name, identity_key, match_status, area, latitude, longitude, brief, practical_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(placeId, place.tripId, place.name, place.identityKey, place.matchStatus, place.area, place.latitude, place.longitude, place.brief, json(place.practical));
        }
        placeIds.set(place.id, placeId);
      }

      for (const link of records.importPlaces) {
        const placeId = placeIds.get(link.placeId);
        if (!placeId) throw new TypeError(`import place references unknown place ${link.placeId}`);
        this.database.prepare('INSERT OR IGNORE INTO import_places (trip_id, import_id, place_id) VALUES (?, ?, ?)')
          .run(imported.tripId, link.importId, placeId);
      }
      for (const evidence of [...records.evidence, ...researchEvidence]) {
        const placeId = placeIds.get(evidence.placeId) || evidence.placeId;
        this.database.prepare(`INSERT OR IGNORE INTO evidence
          (id, trip_id, place_id, source_url, retrieved_at, facts_json, source_kind, source_path, timestamp_seconds)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(evidence.id, imported.tripId, placeId, evidence.sourceUrl, evidence.retrievedAt, json(evidence.facts), evidence.source, evidence.sourcePath, evidence.timestampSeconds);
      }
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  close() { this.database.close(); }
}

async function createSQLiteImportStore(filename = ':memory:') {
  const { schemaSql } = await import('../../../shared/database/schema.js');
  const database = new DatabaseSync(filename, { enableForeignKeyConstraints: true });
  database.exec(schemaSql);
  return new SQLiteImportStore(database);
}

module.exports = { SQLiteImportStore, createSQLiteImportStore };
