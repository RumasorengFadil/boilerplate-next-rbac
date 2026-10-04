# Implementation Report — Portfolio Task 2

**Tanggal:** 2026-10-04

**Classification:** LARGE

**Status:** COMPLETED (Task 2); overall PARTIALLY COMPLETED.

## Rencana dan Tracking

- Current Task: Task 2 — database, kontrak portfolio, lifecycle dan seeder.
- Progress: 2/6 tasks selesai.
- Next Task: Task 3 — menu Portfolio admin, Tiptap ID/EN dan archive/restore UI.
- Remaining: Task 4 DB-only public slug/detail/SEO; Task 5 PPR/cache invalidation; Task 6 QA integrasi/responsive.
- Tidak menjalankan Task 3–6 sebelum konfirmasi pengguna.

## Penyebab dan Perubahan

- Penyebab: database CMS sudah UUID tetapi belum mempunyai soft delete terpisah, route reservations historis atau kontrak rich body. Public masih mencampurkan contoh statis/UUID routes.
- Perubahan: additive migration, namespace canonical/alias yang terlindungi trigger, public lookup service, authenticated save/lifecycle, Zod rich JSON dan seeder tiga ilustrasi.
- Restore selalu DRAFT, tidak otomatis publish. Slug/alias tetap reserved setelah archive. Edit melalui textarea lama ditolak jika dapat menghilangkan richBody.
- Seeder create-if-missing memakai UUID tetap; repeat tidak menimpa edit, rename atau deleted records. Seluruh seed rollback bila salah satu alias bertabrakan.
- Runner memperbaiki urutan `.env.local` sebelum import Prisma. Percobaan awal runner gagal sebelum commit seed; final local run membuat 3, run berikutnya mempertahankan 3.
- Tambahan di luar daftar awal telah dilaporkan: cleanup fixture `tests/seo.test.mjs` menyesuaikan FK RESTRICT, tanpa mengubah assertion SEO atau source public.
- Perubahan pengguna pada AGENTS.md dan public work/[id]/page.tsx dipertahankan dan tidak dimasukkan commit task.

## File Change

Created:

- `prisma/migrations/20261004010000_portfolio_foundation/migration.sql`
- `src/features/cms/rich-text.ts`
- `src/features/portfolio/schema.ts`
- `src/features/portfolio/service.ts`
- `src/features/portfolio/seed.ts`
- `scripts/typescript-loader.mjs`
- `scripts/seed-portfolio.mjs`
- `tests/portfolio.test.mjs`
- `tests/portfolio-integration.test.mjs`
- `docs/reports/2026/10/04/portfolio_task2.md`

Modified:

- `prisma/schema.prisma`
- `src/features/cms/schema.ts`
- `src/features/cms/service.ts`
- `package.json`
- `tests/seo.test.mjs`
- `docs/database/schema.md`
- `docs/deployment/installation.md`
- `docs/features/portfolio.md`
- `docs/README.md`

Deleted: None

Moved/Renamed: None

## Database Change

- Migration `20261004010000_portfolio_foundation` diterapkan pada PostgreSQL test terisolasi dan database `lunabiner` lokal tanpa reset.
- ContentEntry: tambah deletedAt nullable TIMESTAMP(3) dan index `(kind,deletedAt,status,publishedAt)`; seluruh existing column/PK dipertahankan.
- PortfolioRoute: UUID PK, unique value, contentId UUID FK RESTRICT/CASCADE, timestamp, contentId index dan CHECK format/panjang.
- Trigger memvalidasi CASE_STUDY owner/immutable reservation serta mencadangkan canonical slug dan UUID setiap create/rename; backfill existing case studies. Konflik kepemilikan gagal atomik SQLSTATE 23505.
- Seed lokal: 3 illustrative CASE_STUDY dengan rich translations ID/EN; 9 reservations (3 slug, 3 UUID, numeric aliases 1–3). Tidak membuat akun, mengubah lead atau knowledge embeddings.
- Detail constraints/functions: [Database](../../../../database/schema.md).

## Architecture Change

- Tetap reuse CMS ContentEntry, workflow/RBAC dan audit module; tidak menduplikasi tabel portfolio.
- Portfolio boundary di `src/features/portfolio/`; rich-text contract reusable di CMS tanpa dependency editor/browser.
- `resolvePublishedPortfolio` menyiapkan canonical/alias lookup server, belum dihubungkan ke HTTP route.
- `savePortfolio` memerlukan content:write dan mengikuti publisher guards CMS; archive/restore memerlukan content:publish, version guard dan audit transactional.
- Tidak ada endpoint public baru, config PPR, shared cache atau perubahan UI. Rendering existing tetap dynamic SSR. Cache invalidation lifecycle akan dihubungkan ketika actions/UI/cache ditambahkan pada task berikutnya.

## Verification

- `npx prisma generate`: PASS.
- `npm run typecheck`: PASS.
- `npm run build`: PASS (Next 16.3.8 webpack; public work masih `ƒ`).
- ESLint seluruh file source/script/test terkait: PASS.
- Regression suite: 45/45 PASS (portfolio/CMS contracts, SEO/OG/sitemap, permissions, client cache, assistant mocks, analytics, scoring, scheduling).
- Portfolio + CMS integration: 6/6 PASS pada database disposable `lunabiner_portfolio_test`, port 55441. Pengujian: permission, publication, optimistic conflict, audit, race slug, rename alias, deleted filter, restore DRAFT, rich-body safety, future schedules dan atomic seed conflict/repeat.
- Seeder lokal: pertama `3 created, 0 preserved`; ulang `0 created, 3 preserved`. Read-only verification: seedEntries=3, seedRoutes=9. Local migration status up to date.
- Tes regresi awal tanpa target DB explicit gagal koneksi; final suite memakai DB terisolasi dan seluruhnya PASS. Tidak menjalankan cleanup test pada database aplikasi. Provider AI dimock; tidak ada panggilan LLM/embedding berbayar.
- PostgreSQL test sementara dihentikan setelah pengujian; direktori temp tidak dihapus. `git diff --check`: PASS.

## Belum Selesai

Menu Portfolio/Tiptap belum ada; generic textarea tidak dapat mengedit rich seeds (guard menjaga konten). Public masih memakai route/renderer existing, sehingga redirect slug dan rich rendering dua kolom belum aktif. PPR/cache invalidation dan responsive/E2E fitur baru belum diuji. Lihat [Portfolio](../../../../features/portfolio.md) dan lanjut Task 3 setelah konfirmasi.
