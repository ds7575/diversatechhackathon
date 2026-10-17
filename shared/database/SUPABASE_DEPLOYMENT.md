# Supabase deployment handoff

Person 3 owns the schema contract; the teammate who owns the Supabase project performs the deployment and supplies runtime configuration.

## Apply

1. Create or select the team Supabase project.
2. Save `supabase.sql` as a timestamped migration in the deployment environment.
3. Apply it once to a fresh development project before production.
4. Run `supabase.verify.sql`; all three checks must finish and return `Travel Sync Supabase schema verified`.
5. Configure the backend with the project URL and a server-only service credential.
6. Configure the frontend with only the public URL and publishable/anonymous key.
7. Never place the service-role secret in a `NEXT_PUBLIC_*` variable.

## Security contract

- Authenticated clients have read access only when `is_trip_member(trip_id)` is true.
- Invite tokens and provider-spend records have no client grant.
- The backend owns all writes until narrower mutation policies are deliberately reviewed.
- `is_trip_member` is `SECURITY DEFINER` with a fixed search path to avoid recursive member policies.
- Realtime tables use the same SELECT policies, so unauthorized rows are not emitted to clients.

## Backend transaction requirements

- Create the trip and organizer membership atomically.
- Deduplicate imports on `(trip_id, normalized_url)` and add every contributor.
- Deduplicate verified places on `(trip_id, identity_key)` and preserve every `import_places` link.
- Replace recommendations and member evaluations in one transaction.
- Compare and increment `trips.plan_revision` in the same transaction that replaces assignments.
- Record every paid provider call in `provider_spend` using its idempotency key.

## Acceptance checks

Use two authenticated test accounts in the development project:

1. Add both accounts to one trip and verify both can read its snapshot.
2. Verify an account outside the trip cannot read any trip-scoped row.
3. Write a reaction through the backend and verify the other member receives the Realtime change.
4. Generate a plan, manually move one place, and verify a stale revision cannot overwrite it.
5. Restart the application and verify trips, Reels, reactions, and assignments remain available.

The repository intentionally contains no project URL, key, user UUID, or secret. Those values belong in the deployment environment, not in this directory.
