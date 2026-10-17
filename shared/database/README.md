# Database

schema.js exports schemaSql for a proposed SQLite store. Execute once on a new database; it is not an upgrade migration. Enable foreign keys on every connection. The backend owns connections, migrations and transactions. See ../contracts/README.md for mapping, identity, deduplication and optimistic plan writes. No credentials or live travel data are included.
