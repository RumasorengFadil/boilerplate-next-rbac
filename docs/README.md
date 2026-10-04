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
| [Portfolio architecture](features/portfolio.md) | Kondisi aktual, keputusan target dan audit kompatibilitas PPR sebelum implementasi. |
| [Portfolio — Task 1](reports/2026/10/04/portfolio_task1.md) | Tracking PRD/arsitektur, baseline verification dan pekerjaan berikutnya. |
| [Portfolio — Task 2](reports/2026/10/04/portfolio_task2.md) | Database/route reservations, lifecycle, rich contracts, seed idempotent dan hasil verifikasi. |
| [Portfolio — Task 3](reports/2026/10/04/portfolio_task3.md) | Menu admin, Tiptap ID/EN, server actions, workflow dan QA desktop/mobile. |
| [Portfolio Prisma runtime fix](reports/2026/10/04/portfolio_prisma_runtime_fix.md) | Pemulihan Unknown argument deletedAt melalui regenerate/restart dev dan verifikasi HTTP. |
| [Portfolio detail panel removal](reports/2026/10/04/portfolio_detail_panel_removal.md) | Penghapusan panel duplikat, narasi Tiptap ID/EN dan perlindungan data detail legacy. |
| [AI Phase 2 tracking](reports/2026/10/03/ai_assistant_phase2_completion.md) | Checklist implementasi terbaru, hasil pengujian dan pekerjaan aktivasi yang tersisa. |

Dokumen di `docs/products/PRD/` menyimpan kebutuhan produk sesuai sumber asli, bukan pernyataan bahwa seluruh fiturnya telah diimplementasikan. Status implementasi dicatat terpisah pada laporan yang relevan.
