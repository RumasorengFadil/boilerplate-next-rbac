# Implementation Tasks

Task: LunaBiner Phase 2 business acquisition platform
Source: docs/products/PRD/PRD_002_lunabiner-phase-2.md
Status: IN_PROGRESS

## Sprint 1 — CMS, leads and RBAC

- [x] T01 Audit existing modules, preserve working assistant and define boundaries.
- [x] T02 Extend roles/permissions and shared transactional audit infrastructure.
- [x] T03 Add UUID CMS schema, localized contracts and publication workflow.
- [-] T04 Implement permission-protected content editing and public published-content integration.
- [ ] T05 Persist contact inquiries and implement lead detail/status/owner/notes/activity.
- [ ] T06 Verify Sprint 1 migrations, authorization, content publication and lead flows; report and commit.

## Sprint 2 — Acquisition measurement

- [ ] T07 Add validated privacy-conscious analytics ingestion and consent-aware browser tracking.
- [ ] T08 Implement dashboard metrics, conversion funnel and AI analytics.
- [ ] T09 Implement explainable configurable lead scoring from observed signals.

## Sprint 3 — Follow-up workflows

- [ ] T10 Implement internal scheduling, timezone/availability, booking conflicts and calendar invitation.
- [ ] T11 Implement newsletter subscription/unsubscription and administration.
- [ ] T12 Implement CRM adapter/outbox abstraction and controlled delivery.

## Sprint 4 — Knowledge integration

- [ ] T13 Connect published CMS knowledge to existing assistant/RAG without duplicating unpublished content.
- [ ] T14 Reverify consent, recommendations, scheduling CTA and failure behavior.

## Sprint 5 — Products and discovery

- [ ] T15 Implement localized Enterprise Chat/AI Cashflow landing pages and waitlist lifecycle.
- [ ] T16 Implement advanced case study presentation, related content and global search.
- [ ] T17 Implement basic rule-based personalization with consent/privacy boundaries.

## Sprint 6 — Release readiness

- [ ] T18 Dynamic sitemap/hreflang/structured data and editorial content growth guidance.
- [ ] T19 Admin 2FA, public spam controls, auth throttling and security review.
- [ ] T20 Operational health/monitoring, scheduled jobs, backup/restore tooling and retention.
- [ ] T21 Regression, desktop/mobile QA, accessibility/performance measurements and final report.
- [ ] T22 Production QA, CDN/monitoring/backup deployment and offsite restore verification (requires actual deployment infrastructure; local checks do not satisfy production acceptance).

## Existing implementation

AI provider abstraction, UUID persistence, grounding, RAG and human-consent AI lead capture are implemented under the separate Updated AI Assistant Phase 2 scope. This is not completion of the broader PRD 002. Existing static case studies are illustrative; no clients or numerical business outcomes will be invented.
