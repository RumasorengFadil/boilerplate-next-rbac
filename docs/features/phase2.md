# LunaBiner Phase 2 — implementation decisions and progress

Source requirement: [PRD 002](../products/PRD/PRD_002_lunabiner-phase-2.md). Task tracking: [TASKS.md](../../products/tasks/lunabiner_phase2_prd/TASKS.md).

## Architectural decisions

Keep the Next.js modular monolith, existing PostgreSQL/Prisma, session guards, public brand/layout and completed assistant. New records use UUID; existing user/session/project IDs remain compatible. Phase 2 roles extend the existing enum instead of replacing account identities. Server permissions guard every write and protected read; menu visibility is not authorization.

CMS uses one versioned `ContentEntry` table with content kind, publication state, slug, locale payloads and validated kind-specific details. This avoids duplicating workflow/localization three times at the current scale. Contracts live in `features/cms`; database access stays server-only. This is a decision, not a claim that CMS is already delivered. Public consumers must query only published/due content. Static public content remains available until real content is published; examples must remain clearly illustrative.

Lead management extends existing `Lead` instead of creating a competing inbox. Notes/activity capture internal follow-up; mutation and audit are transactional. Contact inquiry capture must persist before presenting a success/WhatsApp next step. Existing `ADMIN` access is preserved; new specialist roles gain only their domain permissions.

## Current implementation

Delivered: six roles, specialist-safe dashboard reads, shared transactional audit and CMS editor/public integration. `/dashboard/content` lists up to 100 records; `/dashboard/content/new` and UUID edit routes provide article/case study/product fields, ID/EN body/SEO, category/tags/author credits, existing asset paths, review/schedule/publish/archive and optimistic versions. Editor cannot publish or modify currently public records. Server actions validate and enforce permissions before mutation; updates/audit commit together. Drafts never appear in public queries; due schedules become visible without claiming a background job.

Homepage/insights/work/products use published CMS content when that kind has records, otherwise existing static cards remain. Article detail uses a slug and CMS case detail uses UUID; static legacy case URLs remain compatible. Body renders escaped plain paragraphs, not executable HTML. CMS listing caps at 200 public records; pagination/search and media upload are not delivered in this stage. Images reference existing `/images/` assets. Reindex AI manually after publication once the separate CMS→RAG task is integrated; current RAG still reads static source.

Verified: five contract/permission tests, CMS transactional integration and production HTTP tests (private draft 404, ID/EN body, editor fields and role guards), typecheck/lint/build. Fixtures ran only on isolated PostgreSQL. Contact is still WhatsApp-only and leads remain read-only until T05 finishes.

Production infrastructure, provider/service connections, real portfolio claims and production performance/restore checks must be verified separately. Optional integrations will use adapters rather than guessed credentials or unauthorized external account changes.
