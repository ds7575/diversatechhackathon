# Database

schema.js exports schemaSql for a proposed SQLite store. Execute once on a new database; it is not an upgrade migration. Enable foreign keys on every connection.

supabase.sql is the equivalent proposed Postgres/Supabase schema. It enables row-level security, grants authenticated trip members read access, and publishes collaborative tables to Supabase Realtime. Writes remain backend-owned through the server-side service role; never expose that credential to the frontend. Review and test this file as a migration before applying it—the repository contains no Supabase project URL, key, or proof of deployment.

See ../contracts/README.md for mapping, identity, deduplication and optimistic plan writes. No credentials, provider keys, or live travel data are included.
