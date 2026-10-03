# LunaBiner Phase 2 — implementation decisions and progress

Source requirement: [PRD 002](../products/PRD/PRD_002_lunabiner-phase-2.md). Task tracking: [TASKS.md](../../products/tasks/lunabiner_phase2_prd/TASKS.md).

## Architectural decisions

Keep the Next.js modular monolith, existing PostgreSQL/Prisma, session guards, public brand/layout and completed assistant. New records use UUID; existing user/session/project IDs remain compatible. Phase 2 roles extend the existing enum instead of replacing account identities. Server permissions guard every write and protected read; menu visibility is not authorization.

CMS uses one versioned `ContentEntry` table with content kind, publication state, slug, locale payloads and validated kind-specific details. This avoids duplicating workflow/localization three times at the current scale. Contracts live in `features/cms`; database access stays server-only. This is a decision, not a claim that CMS is already delivered. Public consumers must query only published/due content. Static public content remains available until real content is published; examples must remain clearly illustrative.

Lead management extends existing `Lead` instead of creating a competing inbox. Notes/activity capture internal follow-up; mutation and audit are transactional. Contact inquiry capture must persist before presenting a success/WhatsApp next step. Existing `ADMIN` access is preserved; new specialist roles gain only their domain permissions.

## Current implementation

Delivered: six roles, specialist-safe dashboard reads, shared transactional audit and CMS editor/public integration. `/dashboard/content` lists up to 100 records; `/dashboard/content/new` and UUID edit routes provide article/case study/product fields, ID/EN body/SEO, category/tags/author credits, existing asset paths, review/schedule/publish/archive and optimistic versions. Editor cannot publish or modify currently public records. Server actions validate and enforce permissions before mutation; updates/audit commit together. Drafts never appear in public queries; due schedules become visible without claiming a background job.

Homepage/insights/work/products use published CMS content when that kind has records, otherwise existing static cards remain. Article detail uses a slug and CMS case detail uses UUID; static legacy case URLs remain compatible. Body renders escaped plain paragraphs, not executable HTML. CMS listing caps at 200 public records; pagination/search and media upload are not delivered in this stage. Images reference existing `/images/` assets. Reindex AI manually after publication once the separate CMS→RAG task is integrated; current RAG still reads static source.

Verified: contract/permission tests, CMS/lead transactional integration, production HTTP CMS/lead/assistant regression and typecheck/lint/build. Fixtures ran only on isolated PostgreSQL.

## Lead capture and follow-up

Scoring decision: one versioned UUID configuration controls bounded weights and explicit observed signals. Company name alone does not imply enterprise size; free-text timeline does not imply a date. Unknown data contributes zero. New lead snapshots retain reasons/config version; configuration changes do not silently rewrite historical scores. Admin recalculation is explicit and audited. Initial configuration is disabled with zero weights until an operator sets business policy. Consent-aware case views and owned AI messages are the only behavioral signals used.

`submitInquiry` accepts name/company/email/whatsapp/need/challenge/timeline/budget, language ID/EN, explicit consent and empty website honeypot. Zod validation and five-per-minute session/IP throttling precede transactional CONTACT lead/activity capture. Unavailable DB never yields success. WhatsApp is an optional link after persistence, not an automatic redirect. Required public_submission cookie is HttpOnly/SameSite Strict/Secure in production, one-hour lifetime. Next.js server-action origin checks protect writes; trusted proxy must replace forwarded IP headers.

AI capture reuses shared leads capture after owner/consent checks. All new leads use configurable scoring; public capture never accepts score/owner/status. `/dashboard/leads` requires leads:read, validates q/status filters and caps at 100; UUID detail shows source/contact/budget/timeline, score snapshot/reasons, up to 100 notes/activity/transcript messages each. This is a shared sales inbox, not per-owner tenancy.

`/dashboard/leads/scoring` and saveScoringAction require operations:manage. Rules include enabled, eight weights (0–100), minimum problem characters (20–2000), target range (1–365 days), behavior lookback (1–90 days). Sum is capped at 100; classification follows PRD Low 0–30 / Medium 31–60 / High 61–80 / Priority 81–100. Default disabled/zero weights is deliberate, not an invented business policy. Enterprise is visitor-declared, budget-filled is not verified affordability, problem length is not semantic quality. Contact offers optional size and target-date fields. Recalculate action accepts UUID/version, requires leads:write, optimistic update plus activity/audit; changed rules do not silently alter old scores. AI engagement uses linked user messages; case views require consent visitor linkage. Historical scores without snapshots are retained until explicit recalculation. Settings save and recalculation return friendly message/success form state; stale versions roll back.

`updateLeadAction`: id UUID, version integer, status enum, ownerId optional compatible User ID; leads:write required. Owner must be ADMIN/SUPER_ADMIN/MARKETING/SALES; stale versions roll back. `addNoteAction`: id/body (2–4000 chars), same permission. Mutation/timeline/audit are atomic; audit excludes contact data/note body/transcript. Responses are success/message form states; invalid input, version/owner errors and unavailable records are friendly failures. Operators choose lifecycle status.

Production infrastructure, provider/service connections, real portfolio claims and production performance/restore checks must be verified separately. Optional integrations will use adapters rather than guessed credentials or unauthorized external account changes.
