# Acquisition analytics

## Collection and privacy

Browser tracking is opt-in through an ID/EN banner. Choice lives in localStorage; no request or analytics cookie is created before acceptance. Pseudonymous visitor UUID cookie lasts 90 days, sliding session UUID cookie 30 minutes, consent cookie 90 days; all are HttpOnly/SameSite Strict/Secure in production. Declining or withdrawing deletes cookies and stops client tracking; it does not retroactively delete persisted history. Visitor ID may be attached to a subsequently consented lead for attribution; do not describe this as irreversibly anonymous data.

Only public pathnames are accepted; queries/fragments, admin/auth URLs, arbitrary metadata and contact/chat content are excluded. IP is hashed only for scoped minute-rate buckets, never stored in AnalyticsEvent. Browser click tracking measures internal navigation/CTA clicks and WhatsApp clicks; page paths identify services/cases/articles. AI panel open is a separate event. Deployment proxy must overwrite forwarded headers. Historical event cleanup is not automated until the operations/retention task is delivered.

## API

POST `/api/analytics/events`: same-origin, max 12,000-character JSON, strict Zod body `{consent:true, kind:PAGE_VIEW|CTA_CLICK|WHATSAPP_CLICK|AI_OPEN, path, target?, language:id|en}`. Path/target must be recognized ID/EN public paths; target cannot be external. Server assigns visitor/session IDs and rate-limits at 60/minute by visitor and hashed IP. Success 200 `{success:true}`; 400 invalid body, 403 origin, 413 oversized body, 429 throttle, 503 unavailable persistence. Keys/PII are never returned.

DELETE `/api/analytics/consent`: same-origin, no payload; deletes three analytics cookies, returns 200 success or 403. Auth is not needed for opt-in public collection.

## Dashboard

`/dashboard/analytics` requires `analytics:read` before data access. Period is validated at 1–90 days. Unique opt-in visitors and attributed converted visitors use exact distinct counts; all leads are a separate count. AI conversion counts only conversations and linked leads created within the same window. Current qualified status is not historical status reconstruction.

Top 20 public pages, event totals, AI conversations, failures and recommendation-card frequencies are available. AI topic categories use rules over at most the latest 5,000 messages, never return raw chat content. New chat requests record PROCESSING/COMPLETED/FAILED; assistant metadata records duration, retrieval degradation and heuristic UNVERIFIED response classification when metrics are enabled. Historical request statuses are not backfilled. The heuristic is not a semantic correctness evaluation. Recommendation-card frequency does not imply visitor selection.

Consultation and ordered service/case funnel remain pending scheduling integration. No fake booking count is presented.

## Database

Migration 20261003060000_phase2_analytics: UUID AnalyticsEvent with visitorId/sessionId, enum kind, path/target/language/time. Indexes `(createdAt,kind)`, `(visitorId,createdAt)`, `(path,kind,createdAt)`. Optional UUID Lead.visitorId is attribution metadata, not a foreign key to events; no invented visitor linkage for pre-existing leads.

## Tests

Contract tests reject missing/false consent, private/query paths, arbitrary PII, unsupported server conversion types and external targets. Production HTTP tests on isolated PostgreSQL verify rejection, same-origin, HttpOnly cookies and event persistence; synthetic records removed after tests. Browser consent interaction/retention QA remains in the release-verification task.
