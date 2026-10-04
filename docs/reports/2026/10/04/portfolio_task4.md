# Portfolio CMS — Task 4

**Tanggal:** 2026-10-04

**Classification:** MEDIUM

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: PRD 003 Task 4 — canonical slug routing, redirect aliases, database-only public portfolio dan SEO integration.
- Progress: Public work/homepage cards/detail/related links memakai eligible database CASE_STUDY. Slug canonical, 308 numeric/UUID/history aliases, no-fallback empty state, metadata/schema/OG/sitemap telah diverifikasi production.
- Next Task: Task 5 cache/PPR feasibility dan invalidation; kemudian Task 6 QA akhir. Tidak dilanjutkan otomatis. Refinement PRD 004 tetap selesai, tidak mengaktifkan modul Phase 2 lain.

## Penyebab dan Perubahan

- Penyebab: Public URL masih nomor/UUID dan masih dapat merender contoh hardcoded saat DB kosong. Pengguna meminta descriptive slug SEO-friendly, UUID sebagai identifier dan database sebagai sumber public.
- Perubahan: Detail page `[slug]` memakai resolver PortfolioRoute dan publication predicate sebelum render/redirect. Metadata/page share request-scoped React result. Current slug 200, registered eligible numeric/UUID/history alias 308 langsung ke slug terkini dalam locale yang sama. Unknown/invalid/draft/review/future schedule/archived/deleted 404 tanpa disclosure atau fallback.
- OG route ikut `[slug]`: canonical PNG 1200×630 no-store, eligible alias 308 ke image canonical, nonpublic 404. Metadata, OpenGraph, Twitter, canonical, hreflang dan CreativeWork JSON-LD konsisten dengan slug.
- PublishedWork cards memakai slug di work/homepage; empty DB menampilkan pesan ID/EN tanpa portfolio statis. Static WorkGrid dihapus. Collection schema work tidak mengiklankan static items; sitemap hanya eligible current slugs, tanpa numeric/UUID/history aliases.
- Related CASE_STUDY metadata UUID existing di-resolve server-side dengan validasi maks. 6 UUID, publication filtering, self/duplicate removal dan configured order; link public memakai slug, dengan label ilustratif. Tidak menambah panel admin/media/RAG integration.
- Work error boundary menampilkan pesan lokal aman dan retry; DB failures tidak diterjemahkan menjadi static content. ARTICLE/PRODUCT compatibility tidak berubah.

## File Change

- Created: `src/app/(public)/[locale]/work/error.tsx`, `tests/portfolio-routing-http.mjs`, laporan ini.
- Modified: `src/features/cms/public.tsx`, `src/features/portfolio/service.ts`, `src/features/website/components.tsx`, `src/features/website/seo/content.ts`, `routes.ts`, `sitemap.ts`; `tests/portfolio-browser.mjs`, `portfolio-integration.test.mjs`, `seo.test.mjs`, `seo-http.mjs`; `docs/features/portfolio.md`, `phase2.md`, `seo.md`, `docs/deployment/installation.md`, `docs/README.md`.
- Deleted: Static WorkGrid dan detail fallback rendering branches; tidak menghapus database record atau seed/RAG source. File lama digantikan route baru di bawah, bukan data delete.
- Move/Rename: `src/app/(public)/[locale]/work/[id]/page.tsx` → `[slug]/page.tsx`; `[id]/opengraph-image/main/route.ts` → `[slug]/opengraph-image/main/route.ts`.
- Perubahan lokal lama pada detail hanya formatting; gaya JSX terformat dipertahankan pada route baru. AGENTS.md milik pengguna tidak diubah atau di-stage.

## Database Change

- Schema/tables/columns/indexes/constraints/migrations: None. Reuse ContentEntry UUID dan PortfolioRoute reservation/trigger existing.
- Database utama: tidak ada migration/seed/update portfolio pada task ini. Main smoke checks read-only. Admin identifier dan metadata relasi tetap UUID.
- Fixture writes/cleanup hanya pada PostgreSQL disposable `lunabiner_portfolio_test`, role portfolio_test, port 55441. Test preview dan disposable PostgreSQL dihentikan setelah QA; database utama tidak dihentikan.

## Architecture Change

- Shared server-only portfolio resolver menjadi sumber eligibility/routing bagi page metadata/render/OG. Alias lookup tidak membocorkan canonical nonpublic. Tidak memakai static next.config redirect map yang mengabaikan workflow.
- Server rendering tetap dynamic SSR dengan request-scoped React memoization; bukan ISR/PPR/shared cache. Cache Components dan rendering shell/data tetap Task 5. Tidak mengubah auth/permission boundaries, external provider, RAG indexing atau metadata publication rules.
- Compatibility numeric RAG source links existing tetap dapat mengikuti mapped redirect; RAG content source sendiri belum database-backed, di luar task ini.

## Verification

- `npm run build`: PASS, Next 16.3.8 webpack; route manifest memakai `/[locale]/work/[slug]` dan image equivalent. `npm run typecheck` dan `npm run lint`: PASS.
- 12 pure CMS/portfolio/legacy/permissions tests PASS; 20 serial DB/actions/persistence/render/SEO tests PASS. Tes Node pure memakai existing TypeScript loader; tidak menambah dependency/package type.
- `tests/portfolio-routing-http.mjs`: PASS production empty work/home/schema, slug links/detail/related content, canonical/schema/OG/sitemap, UUID/numeric/history HTTP 308 pada Twitterbot/Googlebot/browser UA, all nonpublic states HTTP 404 tanpa Location/content, due schedules, missing/invalid route. Re-run tambahan empty-schema assertion juga PASS.
- `tests/seo-http.mjs`: PASS 22 public ID/EN routes, all fixed page families, CMS slug/article static detail, canonical/metadata/JSON-LD, real 1200×630 PNGs, sitemap canonical crawl, publication visibility, hreflang/root lang, private noindex/robots dan multiple UAs.
- `tests/portfolio-browser.mjs`: PASS Chrome headless create/edit/reload Tiptap ID/EN, unsafe-link rejection, review/publish/archive/restore, RBAC, generic admin redirect, public alias navigation ending at localized slug, desktop/mobile no overflow. Screenshot desktop/public dan mobile/content diperiksa di `/private/tmp/lunabiner-portfolio-admin-qa-DvW33I`; tidak di-commit. Logo, teal/orange, spacing, typography dan dua kolom existing dipertahankan.
- Initial typecheck memakai stale generated `[id]` route types; build memperbaruinya dan typecheck ulang PASS. Dev hot-reload tidak pulih setelah folder rename: verified workspace next dev di-restart, bukan database/reset. Smoke pada main dev: `/id/work/1` HTTP 308 → `/id/work/platform-operasi-perusahaan-energi`; `/en/work/otomasi-dokumen-bisnis-distribusi` HTTP 200. Dev server dibiarkan aktif di `127.0.0.1:3000` untuk review.
- `git diff --check`: PASS. Tidak ada secret, private backup, generated screenshots, AI attribution atau push. No LLM/embedding requests.

## Remaining Tasks

- Task 5 — Public data cache/invalidation, scheduled publication timing dan evaluasi PPR yang benar dengan production proof; fallback streaming SSR + cache jika perlu, bukan label PPR palsu.
- Task 6 — QA akhir lintas lifecycle, locale, responsivitas dan dokumentasi release setelah rendering/cache selesai.

Review Task 4 terlebih dahulu sebelum melanjutkan Task 5.
