# Implementation Report — Products Task 3c

**Tanggal:** 2026-10-05

**Classification:** MEDIUM

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: 3c — backup/migration/bilingual seed/QA; Parent Task 3 Admin Produk, PRD002 IN PROGRESS.
- Progress: 3a–3c selesai. Main cleanup diterapkan, backup retained, idempotency verified.
- Next Task: 4 upload cover; 5 public detail/SEO/DB-only; 6 cache/streaming; 7 final QA. Tidak melanjutkan otomatis.

## Penyebab dan Perubahan

- Legacy Detail/richBody dan single-array features redundant; source sekarang Ringkasan dan localized productFeatures.
- Converter membersihkan duplicate narrative, menolak distinct body/rich formatting/invalid/oversized content. Perbandingan JSON canonical + normalized rich schema memperbaiki false-positive formatting akibat property order/default representation. Heading/marks/links nyata tetap konflik.
- CLI preview/apply/restore memakai local DB confirmation, Serializable/advisory lock/version/audit, deterministic validated backup, no automatic GET/build writes. Max10.000 rows/10MB backup. Restore menolak stale/mismatched version/JSON/target, tidak mengubah workflow atau rewind version.
- Seeder baru summary-only+bilingual fixed UUID COMING_SOON, existing edits/archive/routes tetap preserved. Known translations hanya contoh UUID+exact English legacy array tanpa localized config; arbitrary/configured lists tidak ditimpa.
- Service summary tidak menciptakan kembali details.features default ketika record baru/migrated tidak memilikinya. Existing legacy yang belum dimigrasikan/restored tetap compatible.

## File Change

- Created: product examples/content-migration modules, operational script, guarded migration tests, report ini.
- Modified: package script, product seed/service/summary converter, action/integration/summary/browser tests; PRD, products/database/installation living docs dan docs index.
- Deleted/Move: None untuk file.

## Database Change

- Main lunabiner: tepat dua PRODUCT version1→2. translations.body/richBody kedua bahasa dan details.features dihapus; details.productFeatures bilingual ditambahkan. Ringkasan/SEO dan metadata lain dipertahankan; UUID/slug/status/publication/delete/readiness/CTA/cover/routes/non-PRODUCT unchanged. Tidak ada SQL migration/tabel/kolom/index/constraint baru.
- Dua audit `product.content.migrate`, actor null/module cms, before/after version dan batchId tanpa body/credential. Restore memakai product.content.restore dan version increment.
- Backup `.local-backups/product-summary/eb53b1ab-b8fb-4db8-b342-c5c378e9f57a.json` private0700/0600, exclusive/fsync/read-back validated sebelum commit; masih tersimpan dan ignored. Restore utama tidak dijalankan. Json yang dihapus dapat dipulihkan melalui guarded CLI jika record belum berubah.
- Repeat preview2scanned/0changes/0conflicts; seed0created/2preserved. No reset, unrelated records untouched.

## Architecture Change

Product-only operational migration, bukan Server Action/public API; DB operator supplies authority. No new dependency/global PPR/ISR/upload/detail/cache. Living docs memuat usage/errors/recovery/limits. Next/gov instructions dibaca sebelum implementasi.

## Verification

- Typecheck/lint/production build PASS.
- 22 test files, **80/80 PASS** serial disposable55441: backup failure/conflicting body/concurrent edit rollback, workflow/routes/unrelated invariants, idempotence, tamper/stale/target rejection, real CLI private backup+restore, bilingual seed no overwrite, no legacy resurrection plus CMS/portfolio/cache/media/SEO regressions.
- Initial fixtures updated for new seed shape dan deterministic tamper value; final full suite PASS. Main preview false rich warning fixed via semantic/default-normalized comparison, not conflict override.
- Production browser QA3010 PASS: summary/features limits native/server, add/remove/localized card, RBAC/status/CTA/UTC/lifecycle, legacy preservation and no resurrected keys. Screens `/private/tmp/lunabiner-products-admin-qa-xAoBVe`; UI layout unchanged from 3b.
- Main `/id/products` dan `/en/products`: HTTP200, localized known features present, no application-error marker. Main snapshot/invariant checks and route reservation comparison PASS.
- diff check/ignored secrets/backup verified; unrelated AGENTS.md not committed. Focused commit, no push.
