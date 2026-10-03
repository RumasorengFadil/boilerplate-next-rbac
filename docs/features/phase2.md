# LunaBiner Phase 2 — implementation decisions and progress

Source requirement: [PRD 002](../products/PRD/PRD_002_lunabiner-phase-2.md). Task tracking: [TASKS.md](../../products/tasks/lunabiner_phase2_prd/TASKS.md).

## Architectural decisions

Keep the Next.js modular monolith, existing PostgreSQL/Prisma, session guards, public brand/layout and completed assistant. New records use UUID; existing user/session/project IDs remain compatible. Phase 2 roles extend the existing enum instead of replacing account identities. Server permissions guard every write and protected read; menu visibility is not authorization.

CMS uses one versioned `ContentEntry` table with content kind, publication state, slug, locale payloads and validated kind-specific details. This avoids duplicating workflow/localization three times at the current scale. Contracts live in `features/cms`; database access stays server-only. This is a decision, not a claim that CMS is already delivered. Public consumers must query only published/due content. Static public content remains available until real content is published; examples must remain clearly illustrative.

Lead management extends existing `Lead` instead of creating a competing inbox. Notes/activity capture internal follow-up; mutation and audit are transactional. Contact inquiry capture must persist before presenting a success/WhatsApp next step. Existing `ADMIN` access is preserved; new specialist roles gain only their domain permissions.

## Current implementation

Delivered foundation: six roles with explicit domain permissions, specialist-safe dashboard reads, and shared transactional audit schema/helper. Migration applied to local lunabiner without resetting data; permission tests, typecheck and production build passed. No account was promoted or created. CMS and operational modules remain tracked separately; assistant already exists, contact form is still WhatsApp-only and lead page is still read-only at this stage.

Production infrastructure, provider/service connections, real portfolio claims and production performance/restore checks must be verified separately. Optional integrations will use adapters rather than guessed credentials or unauthorized external account changes.
