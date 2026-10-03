# Scheduling — Prisma development cache fix

Status: COMPLETED

## Summary
Reported consultations findMany failure is consistent with a pre-scheduling Prisma singleton surviving development hot reload. Fresh generated client exposes both scheduling delegates; an old instance does not gain new models after generation.

## Task Status
Cache correction and startup generation completed; scoped development runtime restarted. No later PRD module implemented.

## Files Changed
src/lib/db.ts, src/lib/prisma-client-cache.ts, package.json, tests/prisma-client-cache.test.mjs and related documentation.

## Database Changes
None. No reset, migration, account change or user-data mutation.

## API Changes
None. Existing server permission checks retained.

## Architecture Changes
Development singleton uses a SHA-256 generated-datamodel fingerprint. Same schema reuses the client; legacy/changed cache creates a new client and disconnects the previous pool. Production creates its normal module-scoped client. Startup regenerates Prisma Client before next dev. Already-loaded generated package still requires runtime restart after regeneration.

## Documentation Updated
docs/deployment/installation.md, docs/features/scheduling.md, docs/README.md and this report.

## Tests Performed
Three tests passed: same-schema reuse, legacy/schema-change invalidation, actual db bootstrap with a simulated stale singleton and generated scheduling delegates. Typecheck, lint and production build passed. Authenticated scheduling HTTP regression passed on isolated PostgreSQL: ADMIN/SALES dashboard access, editorial/member denial, localized public forms and private calendar access. Isolated test fixtures removed; temporary test DB stopped afterward.

## Manual Test
No browser interaction performed for this fix. Local runtime was restarted on port 3000; HTTP smoke check returned 200 with a successful scheduling availability query and no undefined-delegate error. Existing browser tab may need reload to discard its previous error/chunks.

## Known Limitations
Deploying a schema change still requires migration/generation and restarting processes with an already-loaded generated package. Fingerprinting is cache invalidation, not a database migration mechanism.

## Remaining Tasks
None for this fix. Broader PRD remains deferred at the user's scheduling review checkpoint.
