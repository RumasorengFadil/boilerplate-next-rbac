# PRD 002 — LunaBiner Phase 2

Status: IN PROGRESS
Task6 COMPLETED — streaming intro/list, cache payload revision di belakang live guards dan invalidasi Server Actions. 89/89 regression/typecheck/lint/build PASS; production SQL cache/tag/HTTP streaming/real clock lifecycle dan public desktop/mobile PASS. Task1–6 selesai; Task7 belum dimulai; tidak ada perubahan database/main writes/PPR global. PRD overall IN PROGRESS.
Pembaruan aktif: 2026-10-05 — Product CRUD/landing management.

Snapshot Task5 COMPLETED — DB-only list (empty/error), slug detail/eligible308/private404, readiness/summary/features/cover/CTA, complete localized metadata/schema/contextual branded OG/sitemap. Verifikasi saat Task5:84/84 regression/typecheck/lint/build, production public+admin browser PASS; main existing detail ID/EN200 read-only. Pada tahap tersebut request memoization saja; Task6 kini menambah cache/streaming seperti tracking terbaru di atas. Tidak ada SQL migration/seed/main data writes.

Task4 COMPLETED — private device cover/UUID/media guards/preview/keep/replace/remove/cancel/retained File. Verifikasi saat Task4:83/83 tests/typecheck/lint/build dan browser product/portfolio PASS, tanpa migration/main writes/task berikutnya. Tracking terbaru Task5 di atas.

## Scope aktif yang dikonfirmasi — Product CRUD

### Refinement 2026-10-05 — Ringkasan-only dan fitur bilingual

Task 3c COMPLETED: operational CLI preview/apply/restore, backup privat terverifikasi, migrasi JSON atomik/idempotent dengan version+audit. Dua produk lokal version1→2 dibersihkan, repeat preview0changes; backup retained. Hanya legacy narasi duplicate dibersihkan; distinct body/formatting menahan seluruh apply. Terjemahan fitur contoh hanya pada UUID contoh dengan array legacy exact-match dan tanpa localized configuration; fitur arbitrary literal ID/EN, configured lists preserved. Seeder summary-only/bilingual, existing seed preserved. Tidak ada SQL migration/perubahan workflow/cover/routes. Verifikasi saat Task3c:80/80 regresi, typecheck/lint/build/browser PASS; tracking berikutnya di atas.

Pengguna menyetujui penghapusan field Detail produk ID/EN yang redundant. Ringkasan/excerpt ID/EN menjadi satu-satunya deskripsi untuk card/detail dan fallback SEO, maksimal 150 karakter (publication minimum 10). Override SEO tetap terpisah. PRODUCT baru setelah integrasi tidak menyimpan body/richBody deskripsi duplikat; ARTICLE/CASE_STUDY tetap unchanged. Fitur produk dapat ditambah/hapus pada form ID/EN, maksimal 12 poin per bahasa dan 100 karakter per poin. Storage baru `details.productFeatures: {id: string[], en: string[]}`; jangan memakai satu array bahasa bersama untuk konten baru.

Task tambahan: 3a kontrak/adapter/tests COMPLETED → 3b UI/save/public existing integration COMPLETED → 3c backup/migration/seed/browser QA COMPLETED. Task 4–7 tetap urutan existing. Adapter tidak menulis pada GET dan mempertahankan teks fitur legacy secara literal pada kedua bahasa sampai diterjemahkan admin; terjemahan contoh known diterapkan seeder/migration secara guarded. Body berbeda dari excerpt tidak dihapus diam-diam: preview migration menahan apply sampai ditinjau. Backup sebelum perubahan data, UUID/status/readiness/CTA/cover/routes tetap. Save existing yang belum dimigrasikan/restored menjaga body/richBody lama; produk baru/migrated hanya menyimpan summary/SEO. Public card existing memakai localized features dengan fallback legacy, termasuk explicit empty list tanpa fallback.

Briefing dikonfirmasi pengguna melalui “oke gas saya setujui”. Gunakan PRD aktif ini karena Product Management dan Product Landing Pages sudah tercakup; tidak membuat PRD duplikat. Requirement berikut memperinci/menggantikan workflow produk pada sumber awal di bawah, bukan mengaktifkan seluruh Phase 2.

- Menu Produk khusus admin; create/list/edit, arsip soft delete dan pulihkan sebagai DRAFT. Record UUID, public detail memakai slug deskriptif. Ikuti pola portfolio tanpa mengubah fitur portfolio/artikel.
- Publikasi produk hanya DRAFT/PUBLISHED/SCHEDULED, langsung berdasarkan pilihan admin tanpa REVIEW wajib. ARCHIVED bukan opsi editor; arsip terpisah. PUBLISHED langsung eligible, SCHEDULED eligible saat tanggal UTC due. DRAFT, future schedule dan arsip tidak masuk public/detail/SEO/OG/sitemap/media anonymous.
- Kesiapan terpisah dari publikasi: COMING_SOON/BETA/LIVE, tampil sebagai Segera hadir/Beta/Tersedia dengan label ID/EN. Kesiapan tidak mempublish produk otomatis dan tidak memaksa URL demo. Pulihkan mempertahankan kesiapan, tetapi publikasi kembali DRAFT.
- Konten title/excerpt/SEO ID/EN dengan field biasa; setelah refinement Task 3a–3c, hanya Ringkasan sebagai deskripsi, bukan field Detail/Tiptap terpisah. Fitur berupa daftar ID/EN yang dapat ditambah/hapus. Teks dirender aman tanpa HTML/Markdown dari input. Halaman detail `/id/products/[slug]` dan `/en/products/[slug]` tetap dikerjakan; daftar cards berisi cover, nama, ringkasan, kesiapan dan tautan detail.
- Cover/thumbnail upload dari perangkat, UUID assets, preview/keep/replace/remove/cancel, validation/server authorization dan private persistent storage mengikuti portfolio. Cover yang sama untuk list/detail; tidak menambah inline/gallery uploads.
- CTA halaman detail: konsultasi internal default atau URL eksternal HTTPS opsional, label ID/EN. Tautan eksternal tidak di-fetch server dan tidak membangun aplikasi/demo/transaksi. Validasi URL/protokol dan rendering link aman.
- Public product mengambil database saja, tanpa fallback statis ketika inventory kosong/gagal. Seeder memasukkan Enterprise Chat dan AI Cashflow sebagai konsep COMING_SOON memakai UUID, idempotent dan tidak overwrite edit/status produk existing. Tidak mengarang kesiapan, fitur aktif, pelanggan atau pricing.
- Metadata → OpenGraph → Twitter → Canonical → Schema.org sesuai konteks halaman/produk; sitemap hanya canonical eligible. History slug/UUID jika terpetakan redirect hanya untuk eligible; unknown/private tidak dibocorkan.
- Rendering mengikuti fallback portfolio yang telah disetujui: static-independent intro melalui streaming SSR, cache payload publik di belakang live eligibility/revision guards, invalidation setelah mutasi. Tidak mengaktifkan Cache Components/PPR global atau menyebut streaming SSR sebagai PPR/ISR.
- Zod external boundaries, requireUser/requirePermission, existing RBAC content:read/write/publish, optimistic version/transaction/audit. Validation friendly dan input form dipertahankan saat gagal. Desktop/mobile konsisten identitas LunaBiner dan adaptasi section/card/spacing/CTA BisaDev.

### Batas scope aktif

Tidak mengerjakan waitlist/newsletter, pricing/payment/subscription, akun pengguna produk, aplikasi Enterprise Chat/AI Cashflow, CMS→RAG, gallery/inline upload, search/pagination baru, cloud media, multi-instance coordination atau deployment production. Requirement sumber awal terkait fitur-fitur itu tetap deferred, bukan acceptance task aktif ini.

### Acceptance dan tracking

- UUID, slug ownership/history, seed idempotent, version/RBAC, archive/restore dan direct status teruji.
- Ringkasan-only ID/EN dan fitur bilingual, readiness independen, perangkat upload dan CTA internal/HTTPS teruji tanpa private data leakage. Migrasi legacy detail/richBody harus backed-up dan konflik ditinjau; perubahan field lain tidak boleh diam-diam menghilangkan format/konten existing. Tiptap portfolio tetap, tidak dicabut dari dependencies.
- Public DB-only list/detail, empty/error, metadata/schema/OG/sitemap serta cache/streaming konsisten dengan publication date.
- Typecheck/build, tests, production HTTP/browser dan desktop/mobile diverifikasi sebelum task selesai.
- Status IN PROGRESS berlaku untuk PRD Phase 2 keseluruhan. Penyelesaian scope Product CRUD tidak menandai fitur Phase 2 yang deferred sebagai selesai.
- Tracking detail Product CRUD: `docs/features/products.md` (disusun pada Task 1 setelah PRD resolution).
- Task1–6 selesai: arsitektur/foundation/admin/cover perangkat, DB-only public list/detail/SEO/OG/sitemap dan guarded cache/streaming. Migration/contoh lokal diterapkan Task3 setelah backup; non-PRODUCT identik. Task7 final QA belum dikerjakan, PRD keseluruhan IN PROGRESS.
- Revisi editor setelah Task 2: pengguna menyetujui textarea karena konten pendek/cenderung statis. Task 3 telah menerapkan CRUD/textarea ID/EN beserta adapter save yang aman; task lain tidak dibatalkan/diubah urutannya.
- Task 3 selesai: ringkasan dan detail textarea ID/EN dibatasi maksimum 150 karakter per field/bahasa, berdasarkan contoh pengguna 109 karakter. Counter, maxLength client dan server validation tersedia; publikasi tetap excerpt minimal 10/body minimal 30. Konten legacy lebih panjang tidak dipotong/migrasikan massal; unchanged text/formatting tetap dipertahankan, teks baru/yang diedit wajib memenuhi batas. Seeder baru memakai deskripsi contoh singkat, tidak menimpa seed existing. Upload cover tetap Task 4.
- Refinement3a–3c selesai: Ringkasan-only/features/guarded migration/seeder, verifikasi saat Task3c80/80 dan browser PASS. Dua produk lokal dimigrasikan dengan backup. Detail/body minimum historis digantikan Ringkasan minimum10; cover Task4, public detail/SEO Task5 dan cache/streaming Task6 selesai. FinalQA Task7 belum selesai.

## Sumber PRD awal (dipertahankan)

PRD Phase 2 — LunaBiner
1. Objective
Phase 2 bertujuan mengubah website LunaBiner dari sekadar company profile menjadi:
intelligent business acquisition platform

Artinya website tidak hanya menampilkan informasi, tetapi mulai membantu:
- memahami kebutuhan calon klien
- mengarahkan visitor ke solusi relevan
- meningkatkan conversion
- mengelola lead lebih baik
- membangun authority
- mengintegrasikan AI sebagai bagian dari customer journey
2. Scope Phase 2
Fokus utama:
1. AI Solution Discovery Assistant
2. Advanced CMS
3. CRM / Lead Management
4. Appointment Scheduling
5. Newsletter
6. Analytics Dashboard
7. Lead Scoring
8. Advanced Case Study
9. Product Landing Pages
10. SEO & Content Growth
11. Monitoring & Optimization
3. Architecture
Tetap menggunakan:
Modular Monolith Architecture

Tidak perlu microservices.
Struktur tambahan:
LunaBiner Monolith
│
├── Public Website
├── CMS
├── Lead Management
├── CRM
├── Analytics
├── Newsletter
├── Scheduling
├── AI Assistant
├── Product Pages
└── Shared Infrastructure

AI boleh terhubung ke external LLM API, tetapi tetap dikelola sebagai module di monolith.
4. AI Solution Discovery Assistant
Goal
AI Assistant bukan chatbot biasa.
Fungsi utamanya:
membantu visitor menemukan solusi LunaBiner berdasarkan masalah bisnis mereka.

Contoh:
User:
Perusahaan saya masih input invoice manual.

AI:
Masalah tersebut dapat dibantu dengan:

Document Intelligence
+
Workflow Automation
+
Data Integration

Recommended Solution:
AI Document Processing

Relevant Service:
AI Solutions

Relevant Case Study:
[Case Study]

CTA:
Discuss This Solution

Capabilities
AI Assistant harus dapat:
- memahami masalah bisnis
- mengklasifikasikan kebutuhan
- merekomendasikan service
- merekomendasikan case study
- merekomendasikan produk
- memberikan next action
- mengarahkan ke konsultasi
- menjawab FAQ LunaBiner
Data Source
Assistant hanya menggunakan knowledge internal:
Services
Portfolio
Case Studies
Products
FAQ
Company Profile
Insights

Jangan biarkan AI membuat klaim yang tidak ada pada website.
Output Structure
Understanding
↓
Recommended Solution
↓
Relevant LunaBiner Service
↓
Relevant Case Study
↓
Suggested Next Step

CTA
- Talk to Us
- Schedule Consultation
- Start a Project
5. AI Assistant UI
Desktop:
Bottom Right
[ LunaBiner AI ]

Saat dibuka:
┌────────────────────────────┐
│ LunaBiner AI               │
│                            │
│ Tell us your challenge.    │
│                            │
│ [ chat ]                   │
│                            │
│ Suggested Questions        │
└────────────────────────────┘

Suggested prompt:
- I want to automate a manual process
- I need an internal business system
- How can AI help my company?
- I want to integrate multiple systems
- I need better business reporting
6. AI Guardrails
AI tidak boleh:
- mengarang portfolio
- mengarang client
- memberikan pricing palsu
- menjanjikan timeline
- memberikan legal commitment
- mengklaim capability yang tidak tersedia
Jika informasi tidak tersedia:
“I don’t have enough information to confirm that. I can help you discuss it with the LunaBiner team.”

7. Advanced CMS
Phase 1 mungkin masih sederhana.
Phase 2 CMS mencakup:
Blog Management
- create
- edit
- draft
- publish
- schedule
- category
- tags
- author
- SEO
- image
- localization
Case Study Management
- title
- slug
- client
- industry
- challenge
- solution
- impact
- features
- gallery
- technology
- capabilities
- related services
- related case studies
- ID/EN
Product Management
- product status
- coming soon
- beta
- live
- feature
- screenshot
- CTA
- waitlist
8. Content Workflow
Status:
Draft
↓
Review
↓
Scheduled
↓
Published
↓
Archived

9. Lead Management
Setiap form submission masuk ke internal lead database.
Fields:
Name
Company
Email
Phone
Service Interest
Business Challenge
Budget
Timeline
Source
Language
Created At
Status
Owner

Lead status:
New
Contacted
Qualified
Proposal
Negotiation
Won
Lost

10. Lead Detail
Admin dapat melihat:
Lead Information

Source Page

Interested Service

AI Conversation

Form Submission

Timeline

Internal Notes

Lead Score

Status

Owner

11. CRM Integration
Untuk awal bisa internal.
Tetapi desain harus memungkinkan integration dengan:
- HubSpot
- Zoho
- Salesforce
- Google Sheets
- webhook
Gunakan integration abstraction supaya tidak hard-coded.
12. Lead Scoring
Score:
0–100

Contoh:
Signal	Score
Enterprise company	+20
Clear business problem	+20
Budget provided	+15
Timeline < 3 months	+15
Service selected	+10
Viewed case study	+5
AI Assistant engagement	+5
Scheduled consultation	+10


Classification:
0–30 Low
31–60 Medium
61–80 High
81–100 Priority

13. Appointment Scheduling
Tambahkan:
Schedule Consultation

Visitor bisa memilih:
- date
- time
- timezone
- topic
- service
Integration optional:
- Google Calendar
- Cal.com
- internal scheduler
14. Consultation Flow
Visitor
↓
Select Service
↓
Select Date
↓
Select Time
↓
Contact Information
↓
Confirmation
↓
Calendar Invitation

15. Newsletter
Newsletter digunakan untuk:
- AI insights
- automation
- software engineering
- digital transformation
- product updates
Form:
Email
Industry (optional)
Interest

Subscriber status:
Active
Unsubscribed
Bounced

16. Analytics Dashboard
Admin dashboard minimal:
Visitors

Page Views

Lead Count

Conversion Rate

Most Viewed Service

Most Viewed Case Study

Top Article

CTA Clicks

WhatsApp Clicks

AI Assistant Usage

Consultation Booking

17. Conversion Funnel
Track:
Visitor
↓
Service Page
↓
Case Study
↓
AI Assistant / Contact
↓
Lead
↓
Qualified Lead
↓
Consultation

18. AI Analytics
Track:
- total conversations
- top questions
- top recommended services
- failed questions
- unanswered topics
- AI → lead conversion
- AI → consultation conversion
Ini penting untuk mengetahui apa yang sebenarnya dicari visitor.
19. Product Landing Pages
Phase 2 mulai buat landing khusus untuk:
Enterprise Chat
Path:
/products/enterprise-chat

Sections:
Hero
Problem
Solution
Capabilities
Security
Deployment
White Label
Use Cases
Architecture
CTA

20. AI Cashflow
Path:
/products/ai-cashflow

Sections:
Hero
Upload Receipt
AI Extraction
Auto Classification
Cashflow Dashboard
AI Insight
Use Cases
Security
CTA

Belum harus produknya live.
Bisa:
Join Waitlist

21. Waitlist
Fields:
Name
Company
Email
Product
Company Size
Use Case

Status:
Interested
Priority
Beta Candidate
Invited

22. Advanced Case Study
Tambahkan:
- KPI
- business impact
- system diagram
- architecture diagram
- before / after
- related service
- downloadable case study PDF optional
Contoh:
Before
Manual workflow
Scattered data
Slow approval

After
Integrated workflow
Centralized data
Automated approval

23. Personalization
Basic personalization:
Jika user banyak melihat AI:
Recommend AI Solutions

Jika user membuka automation page:
Show automation case studies

Tidak perlu AI-heavy.
Rule-based cukup.
24. Search
Tambahkan global search untuk:
- insights
- case studies
- services
- products
Search bar:
Search LunaBiner...

25. SEO Phase 2
Advanced SEO:
- hreflang
- dynamic sitemap
- Article schema
- Service schema
- FAQ schema
- Breadcrumb schema
- Organization schema
- Case Study structured metadata
- internal linking engine
26. Content Growth Strategy
Target cluster:
AI for Business
Business Automation
Custom Software
Enterprise AI
System Integration
Digital Transformation
Data Analytics

Hub:
Pillar Article
↓
Supporting Articles
↓
Service Page
↓
Case Study
↓
CTA

27. Security
Phase 2 perlu ditingkatkan:
- RBAC admin
- 2FA admin
- audit log
- rate limiting
- CAPTCHA
- CSRF protection
- secure cookies
- input validation
- IP logging
- secrets management
- dependency audit
- backup
- restore test
28. Admin RBAC
Roles:
Super Admin

Admin

Content Editor

Marketing

Sales

Permission contoh:
Feature	Super Admin	Content	Marketing	Sales
Blog	✅	✅	✅	❌
Case Study	✅	✅	✅	❌
Lead	✅	❌	✅	✅
Analytics	✅	❌	✅	✅
User Management	✅	❌	❌	❌


29. Audit Log
Track:
User
Action
Module
Record
Before
After
Timestamp
IP

30. Performance
Target:
LCP < 2.5s
CLS < 0.1
INP < 200ms

Additional:
- image optimization
- CDN
- caching
- lazy loading
- database index
- query optimization
31. Monitoring
Track:
- uptime
- server CPU
- RAM
- disk
- application error
- API error
- database status
- AI API failure
- scheduled job failure
32. Backup
Minimal:
Database Daily

Media Daily

Offsite Backup

7 Daily
4 Weekly
3 Monthly

33. Modular Monolith Rules
Phase 2 wajib tetap mempertahankan boundary.
Contoh:
modules/
├── ai/
├── analytics/
├── blog/
├── case-study/
├── crm/
├── lead/
├── newsletter/
├── product/
├── scheduling/
└── users/

Rule:
Module tidak boleh mengakses internal module lain secara sembarangan.

Gunakan:
- service interface
- domain API
- shared events jika diperlukan
Supaya monolith tetap maintainable.
34. Database Domain
Entity utama:
users
roles
permissions

articles
categories
tags

case_studies
case_study_media

products
waitlists

leads
lead_notes
lead_activities

consultations

newsletter_subscribers

ai_conversations
ai_messages

analytics_events

audit_logs

35. MVP vs Phase 2
Setelah Phase 2:
PHASE 1
Company Profile
Blog
Portfolio
Services
Contact
ID / EN
SEO

        ↓

PHASE 2
AI Assistant
CRM
Lead Management
Lead Scoring
Scheduling
Newsletter
Advanced CMS
Analytics
Product Landing Pages
Waitlist
Advanced SEO

36. Prioritas Implementasi Phase 2
Jangan implement semuanya paralel.
Urutan yang saya sarankan:
Sprint 1
Advanced CMS
Lead Management
RBAC

Sprint 2
Analytics
Lead Tracking
Lead Scoring

Sprint 3
Scheduling
Newsletter
CRM Integration

Sprint 4
AI Assistant

Sprint 5
Product Landing Pages
Waitlist

Sprint 6
SEO Optimization
Performance
Security
Monitoring

Alasannya: AI Assistant sebaiknya dibangun setelah data internal dan lead flow sudah stabil.
37. Success Metrics
Phase 2 dianggap berhasil jika:
Increase visitor → lead conversion

Increase consultation bookings

Increase case study engagement

Increase organic traffic

AI successfully recommends relevant solutions

AI conversations generate leads

Admin can manage content without developer

Sales can track lead lifecycle

Metrics utama:
- visitor → lead
- lead → consultation
- consultation → proposal
- AI → lead
- organic traffic
- returning visitor
- article engagement
38. Out of Scope Phase 2
Belum perlu:
- microservices
- Kubernetes
- native mobile app LunaBiner
- customer portal
- project management
- invoicing
- full ERP
- enterprise chat implementation
- AI cashflow implementation
Enterprise Chat dan AI Cashflow masih product landing + waitlist.
39. Definition of Done
Phase 2 selesai jika:
- AI Assistant production-ready
- CMS full usable
- lead management berjalan
- analytics dashboard tersedia
- consultation booking tersedia
- newsletter tersedia
- lead scoring aktif
- product landing tersedia
- waitlist tersedia
- ID/EN seluruh module
- SEO lengkap
- RBAC aktif
- audit log aktif
- monitoring aktif
- backup tested
- security review selesai
- responsive selesai
- production QA selesai
Rekomendasi final Phase 2
Kalau LunaBiner masih tahap awal bisnis, saya akan menjadikan tiga fitur ini sebagai core Phase 2:
AI Solution Discovery Assistant + Lead Management + Analytics

Karena tiga hal ini langsung berhubungan dengan tujuan bisnis website:
Visitor
↓
Understand Need
↓
Recommend Solution
↓
Capture Lead
↓
Measure Conversion

Fitur lain seperti newsletter, waitlist, scheduling, dan advanced CMS mendukung alur tersebut, tetapi bukan pusatnya.
