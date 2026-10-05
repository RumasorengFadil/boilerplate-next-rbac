# Dokumentasi boilerplate

| Dokumen | Kegunaan |
|---|---|
| [Architecture](architecture/overview.md) | Struktur aplikasi dan alur data. |
| [Database](database/schema.md) | Model Prisma, index, constraint, dan migrasi. |
| [Security](security/authentication.md) | Session dan RBAC. |
| [Deployment](deployment/installation.md) | Clone, konfigurasi, database, build. |
| [Projects](features/projects/README.md) | Contoh module dasar. |
| [Architecture Blueprint](governance/ARCHITECTURE_BLUEPRINT.md) | Konvensi portable untuk project baru. |
| [Design](governance/DESIGN.md) | Dasar visual dan aksesibilitas. |
| [Audit](BOOTSTRAP_AUDIT.md) | Pemisahan reusable core dari aplikasi sumber. |
| [LunaBiner AI](ai-assistant.md) | Arsitektur, konfigurasi, retrieval, tools, persistence, security dan pengujian assistant. |
| [LunaBiner Phase 2](features/phase2.md) | Keputusan modular, scope dan tracking implementasi PRD 002. |
| [Acquisition analytics](features/analytics.md) | Consent, event ingestion, privacy, cookie dan atribusi lead. |
| [Consultation scheduling](features/scheduling.md) | Internal slot availability, timezone, booking and calendar invitation. |
| [Public SEO](features/seo.md) | Metadata bilingual, canonical/schema/OG, sitemap, crawl policy dan HTML language. |
| [Public SEO — Task 1](reports/2026/10/03/public_seo_task1.md) | Tracking fondasi SEO, hasil pengujian dan task integrasi yang tersisa. |
| [Public SEO — Task 1 correction](reports/2026/10/03/public_seo_task1_correction.md) | Bundle metadata/schema lengkap, category dan schema Blog mengikuti referensi pengguna. |
| [Public SEO — Task 2](reports/2026/10/03/public_seo_task2.md) | Integrasi public ID/EN, detail published, JSON-LD dan OG image; verifikasi HTML/PNG aktual. |
| [Public SEO — Task 3](reports/2026/10/04/public_seo_task3.md) | Sitemap published/canonical, robots/noindex, root lang, H1 dan hasil audit SEO final. |
| [Public home formatting](reports/2026/10/04/public_home_formatting.md) | Perapian struktur JSX halaman home public tanpa perubahan behavior. |
| [Scheduling cache fix](reports/2026/10/03/scheduling_prisma_cache_fix.md) | Perbaikan stale Prisma Client pada development dan hasil verifikasi. |
| [AI LunaBiner-only scope — Task 1](reports/2026/10/03/ai_assistant_lunabiner_scope_task1.md) | Guardrail server, keputusan scope, hasil pengujian dan tautan tracking lanjutan. |
| [AI LunaBiner-only scope — Task 2](reports/2026/10/03/ai_assistant_lunabiner_scope_task2.md) | Penjelasan scope UI bilingual, contoh pertanyaan dan verifikasi desktop/mobile. |
| [PRD 001 — Company Profile LunaBiner](products/PRD/PRD_001_company-profile-lunabiner.md) | Arsip PRD awal company profile dan scope MVP dari dokumen sumber pengguna. |
| [PRD 002 — LunaBiner Phase 2](products/PRD/PRD_002_lunabiner-phase-2.md) | Arsip PRD Phase 2 untuk business acquisition platform dari dokumen sumber pengguna. |
| [PRD 003 — Portfolio CMS](products/PRD/PRD_003_portfolio-cms.md) | Requirement UUID, slug, Tiptap, database-only portfolio, soft delete dan prioritas PPR yang dikunci. |
| [Portfolio architecture](features/portfolio.md) | Kondisi aktual, audit PPR, fallback rendering/cache dan production regression. |
| [Portfolio — Task 1](reports/2026/10/04/portfolio_task1.md) | Tracking PRD/arsitektur, baseline verification dan pekerjaan berikutnya. |
| [Portfolio — Task 2](reports/2026/10/04/portfolio_task2.md) | Database/route reservations, lifecycle, rich contracts, seed idempotent dan hasil verifikasi. |
| [Portfolio — Task 3](reports/2026/10/04/portfolio_task3.md) | Menu admin, Tiptap ID/EN, server actions, workflow dan QA desktop/mobile. |
| [Portfolio — Task 4](reports/2026/10/04/portfolio_task4.md) | Canonical slug, HTTP 308 aliases, database-only public, SEO/OG/sitemap dan QA desktop/mobile. |
| [Portfolio Prisma runtime fix](reports/2026/10/04/portfolio_prisma_runtime_fix.md) | Pemulihan Unknown argument deletedAt melalui regenerate/restart dev dan verifikasi HTTP. |
| [Portfolio detail panel removal](reports/2026/10/04/portfolio_detail_panel_removal.md) | Penghapusan panel duplikat, narasi Tiptap ID/EN dan perlindungan data detail legacy. |
| [PRD 004 — Portfolio Tiptap single source](products/PRD/PRD_004_portfolio-tiptap-single-source.md) | Refinement narasi rich-only dan cleanup key JSON legacy setelah migrasi aman. |
| [Portfolio Tiptap — Task 1](reports/2026/10/04/portfolio_tiptap_task1.md) | Konverter nonmutating, deduplikasi teks dan preview database read-only; apply belum dilakukan. |
| [Portfolio Tiptap — Task 2](reports/2026/10/04/portfolio_tiptap_task2.md) | Default legacy di editor, rich renderer public dan save/seed tanpa key narasi legacy; bulk cleanup tersisa. |
| [Portfolio Tiptap — Task 3](reports/2026/10/04/portfolio_tiptap_task3.md) | Backup privat, atomic cleanup tiga portfolio lokal, guarded restore, idempotency dan hasil QA. |
| [PRD 005 — Portfolio cover upload](products/PRD/PRD_005_portfolio-cover-upload.md) | Refinement upload perangkat, UUID assets, private persistent storage dan batas scope. |
| [Portfolio cover — Task 5A](reports/2026/10/04/portfolio_cover_task5a.md) | File picker/preview, validasi gambar, media authorization dan hasil QA upload. |
| [Portfolio validation feedback](reports/2026/10/04/portfolio_validation_feedback.md) | Pesan publikasi per kolom/bahasa, inline errors dan aksesibilitas tanpa mengubah aturan konten. |
| [PRD 006 — Portfolio direct status](products/PRD/PRD_006_portfolio-direct-status.md) | Status langsung tanpa urutan REVIEW wajib; arsip tetap soft-delete existing. |
| [Portfolio direct status](reports/2026/10/04/portfolio_direct_status.md) | Guard CASE_STUDY, publish/schedule langsung, regression public/sitemap/RBAC dan arsip. |
| [Portfolio PPR feasibility — Task 5B.1](reports/2026/10/04/portfolio_ppr_feasibility.md) | Bukti build terisolasi, hambatan route configs/root locale dan rekomendasi fallback; belum mengubah rendering production. |
| [Portfolio rendering/cache — Task 5B.2](reports/2026/10/04/portfolio_rendering_cache.md) | Streaming Work, revision-keyed payload cache dengan live publication guards dan action invalidation. |
| [Portfolio production cache — Task 5B.3](reports/2026/10/04/portfolio_cache_production.md) | Bukti SQL cold/warm, Server Action tag expiry, HTTP streaming dan warm-cache lifecycle/privacy. |
| [Portfolio final QA — Task 6](reports/2026/10/04/portfolio_final_qa.md) | Acceptance PRD 003–006, 50 tests, production/browser/visual QA dan batas operasional. |
| [Products architecture/tracking](features/products.md) | Scope aktif PRD 002, audit kondisi existing, target CRUD/readiness/CTA/upload/detail dan urutan task. |
| [Products Task 1 — Architecture](reports/2026/10/05/products_task1_architecture.md) | PRD resolution, keputusan arsitektur dan baseline; runtime product baru belum diimplementasikan. |
| [Products Task 2 — Foundation](reports/2026/10/05/products_task2_foundation.md) | UUID/slug reservations, contracts, transactional service, readiness/CTA/legacy compatibility dan seeder; main activation belum dilakukan. |
| [Products editor plan update](reports/2026/10/05/products_plan_textarea.md) | Revisi Task 3 menjadi textarea ID/EN, menjaga compatibility rich existing dan scope public detail/SEO. |
| [Products Task 3 — Admin](reports/2026/10/05/products_task3_admin.md) | CRUD bilingual bounded textarea, readiness/CTA/arsip, server guards, browser QA dan activation database lokal. |
| [Products Task 3a — Summary contract](reports/2026/10/05/products_task3a_summary-contract.md) | Kontrak Ringkasan-only, fitur ID/EN dan nonmutating legacy/migration preflight; integrasi UI menunggu Task 3b. |
| [Products Task 3b — Summary editor](reports/2026/10/05/products_task3b_summary-editor.md) | UI Ringkasan-only, tambah/hapus fitur ID/EN, transactional save dan localized public card; migrasi legacy tetap 3c. |
| [Products Task 3c — Data migration](reports/2026/10/05/products_task3c_data-migration.md) | Backup/apply/guarded restore, cleanup dua produk lokal, bilingual seeder dan idempotency/regression/browser QA. |
| [Products Task 4 — Cover upload](reports/2026/10/05/products_task4_cover-upload.md) | Upload perangkat, UUID/private WebP/media guards, retained File retry, thumbnails dan regresi desktop/mobile. |
| [Products Task 5 — Public SEO](reports/2026/10/05/products_task5_public-seo.md) | DB-only list/detail slug/readiness/CTA, localized metadata/schema/OG/sitemap, eligible308/private404 dan desktop/mobile QA. |
| [Products Task 6 — Rendering cache](reports/2026/10/05/products_task6_rendering-cache.md) | Streaming intro dan guarded revision payload cache; live privacy serta Server Action tag expiry. |
| [AI Phase 2 tracking](reports/2026/10/03/ai_assistant_phase2_completion.md) | Checklist implementasi terbaru, hasil pengujian dan pekerjaan aktivasi yang tersisa. |

Dokumen di `docs/products/PRD/` menyimpan kebutuhan produk sesuai sumber asli, bukan pernyataan bahwa seluruh fiturnya telah diimplementasikan. Status implementasi dicatat terpisah pada laporan yang relevan.
