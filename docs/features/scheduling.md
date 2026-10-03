# Consultation scheduling

## Decision and scope

Use an internal scheduler with explicit UTC slots curated by admin, not guessed team availability. Visitor selects service/date/time and valid IANA display timezone; database stores UTC. One shared team calendar prevents overlaps globally. Booking and consented lead capture are one transaction with database constraints protecting concurrent requests. UUID receipts use a hashed random calendar-download token; no public lookup exposes contacts. Optional Google Calendar/Cal.com and outbound email are not configured or claimed as delivered. Calendar invitations are downloadable ICS, not automatically emailed.

## Current implementation

ID/EN `/[locale]/consultation` is dynamic: availability must never be prerendered at build time. It exposes at most 200 enabled, unbooked slots from one hour to 90 days ahead. Public payload includes slot UUID, UTC start/end and service only, never existing booking contacts. Date/time selectors display selected IANA timezone, including cross-date offsets. Service-specific or any-service slots are supported. Contact page links to scheduling. No fake availability is seeded in the user's database.

Unavailable database shows an explicit availability-load failure and contact alternative, not a false zero-slot claim. Admin must create real availability before visitors can reserve.

`/dashboard/consultations` requires leads:read; it shows latest 100 bookings and related lead links. ADMIN/SUPER_ADMIN have operations:manage to create 15–120-minute UTC slots and withdraw unbooked availability. SALES/MARKETING with leads:write can cancel bookings, not change availability. Cancellation uses optimistic version, activity/audit transaction and makes the slot bookable again. Lead record remains; cancel does not retract third-party calendars automatically.

Public bookConsultationAction validates a strict body: slotId UUID, service enum, valid timezone, topic 10–2000 chars, name/email/company/phone, language ID/EN, explicit consent and empty website honeypot. Shared session/IP rate limit is five/minute; Next.js server-action origin checks protect writes. React `$ACTION_*` transport metadata is removed before strict feature parsing; arbitrary feature fields remain rejected. Valid contact fields are retained on a slot-persistence failure. Repeated success state does not submit another booking.

Booking transaction locks its slot, verifies current availability/service/time, captures one CONSULTATION lead with scoring and visitor attribution only if analytics consent exists, inserts booking and activity. A partial unique active-slot constraint protects races and enabled-slot range exclusion prevents team-calendar overlaps. No model-driven booking or AI ownership attribution is inferred. Assistant booking CTA/integration is deferred with the later AI task.

Confirmation returns UUID/timezone/start and one bearer calendar-download link. Token is random 256-bit and stored SHA-256 only. Save the invitation from the confirmation; email is not sent. The ICS contains UTC dates, UUID UID, generic summary/status, no email/name/topic. It uses CRLF and line folding. Local display timezone does not alter the underlying UTC instant.

## Calendar API

GET `/api/consultations/<uuid>/calendar?token=<64 hex characters>`: no account authentication; possession of the receipt token authorizes this one calendar file. 200 text/calendar attachment with private/no-store, no-referrer and noindex headers. Invalid UUID/token, unknown booking or lookup failure gives generic 404. Token grants no contact lookup or cancellation. Cancelled bookings return CANCELLED ICS; do not promise automatic Google Calendar/email updates. Treat receipt URLs as private and configure reverse-proxy access logging to omit query strings. Tokens have no automatic expiry yet; they remain valid while the booking exists.

## Verification and limits

Contract and isolated PostgreSQL tests cover invalid consent/UUID/timezone/spam fields, framework metadata handling, overlap rejection, concurrent booking atomicity, RBAC, cancellation/stale versions and hashed calendar-token access. Production HTTP checks verify ID/EN pages, admin/sales access and private ICS. Browser QA at 1440px and 390px verifies actual reservation/confirmation, lead/status/recalculation/cancellation and New York date rollover. These are local checks, not production acceptance. Only synthetic fixtures were used and cleaned afterward.

No outbound email, external calendar, recurring availability, multi-team capacity, self-service cancel link or pagination is delivered. Availability is curated explicitly by admin; zero slots means visitors use contact. Admin labels remain Indonesian. Broader full-funnel/AI-to-consultation attribution is deferred for review, not claimed complete.
