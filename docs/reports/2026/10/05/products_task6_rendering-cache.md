# Implementation Report — Products Task 6

**Tanggal:** 2026-10-05

**Classification:** MEDIUM

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: Task6 — streaming/cache/invalidation; Parent Task None; PRD002 overall IN PROGRESS.
- Progress: Task1–6/refinement3a–3c COMPLETED; Task7 NOT STARTED. Hanya Task6 pada approval ini.
- Next Task: Task7 — final regression/browser/visual QA, setelah konfirmasi pengguna.

## Penyebab dan Perubahan

- Penyebab: list Task5 menunggu seluruh query sebelum intro; produk hanya memakai request memoization, belum persistent payload cache/invalidation.
- Perubahan: static-independent intro/CTA di luar Suspense; loading status ID/EN menggunakan card/spacing/warna existing. Cards dan collection JSON-LD berada di boundary yang sama. Empty/error tetap explicit, tidak fallback ke contoh statis. Layout/detail/content tidak dirombak.
- Live inventory/route/publication/slug/revision guards mendahului cached payload. Exact UUID/version/updatedAt menjadi key, sumber database diisolasi SHA256 tanpa credential plaintext. Cache TTL300/tag products-public; Date direhidrasi dan urutan inventory dipertahankan.
- Mutasi save/archive/restore serta generic CMS PRODUCT save menghapus cache melalui updateTag setelah commit. Path invalidation existing dipertahankan. Media/permissions/admin/eligibility tidak dicache. Tidak memakai fallback warm payload jika DB gagal.

## File Change

- Created: tests/products-cache.test.mjs; tests/products-cache-production.mjs; report ini.
- Modified: src/features/products/public-data.ts, service.ts, actions.ts; src/features/cms/actions.ts; src/app/(public)/[locale]/products/page.tsx; tests/products-public.test.mjs; docs/features/products.md, seo.md, phase2.md; docs/architecture/overview.md; docs/deployment/installation.md; PRD002; docs/README.md.
- Deleted: None.
- Move/Rename: None. AGENTS.md milik pengguna tidak diubah/stage/commit.

## Database Change

- Tables/columns/indexes/constraints/relations/migrations: None.
- Tidak ada main DB writes/seed/migration. Fixtures hanya database disposable lunabiner_portfolio_test, role portfolio_test, loopback55441. Private backups existing dipertahankan.

## Architecture Change

- Streaming SSR + guarded persistent Next Data Cache, bukan PPR/ISR. Cache Components OFF. API unstable_cache mengikuti fallback portfolio; installed Next docs merekomendasikan use cache untuk Cache Components, tetapi migrasi global itu di luar scope yang disetujui.
- Request React cache menyatukan UI/schema serta detail/metadata. Detail/OG guard sebelum render/redirect agar private404 dan eligible308 benar. SCHEDULED due diperiksa waktu nyata tanpa background status job atau menunggu TTL.
- List data failure tetap HTML200 explicit alert + graph tanpa ItemList; detail/OG/sitemap failures propagate, bukan disclosure/false fallback. No-store private media unchanged. Tidak menambah API publik/write endpoint, cached auth atau koordinasi multi-instance.

## Verification

- npm run typecheck, npm run lint, npm run build: PASS.
- Focused cache unit5/5: warm reuse/live privacy, revisions/date/tag/alias, DB outage, revision race fail closed dan delayed-query streaming PASS.
- Production SQL proof: detail/list cold1 payload SELECT, warm0; live guards tetap berjalan. HTTP intro/loading diterima saat tabel disposable dikunci, cards/schema setelah unlock. Real Server Action save expires unchanged canary once then warm hit PASS.
- Production scheduled/archive/restore lifecycle PASS: real-clock due tanpa status job/TTL, private current/history/UUID404 untuk browser/search/social bots, ID/EN list/detail/metadata/OG/schema/sitemap konsisten, archive/restore expire unchanged canary1→0; restore DRAFT tetap private. No browser/runtime cache errors.
- Full serial regression89/89 PASS: CMS/product/portfolio/cover/migration/SEO/Prisma plus five cache unit tests.
- Public production3011 HTTP/browser desktop/mobile PASS: empty/catalog, localized detail/readiness/summary/features/CTA/cover, one canonical/H1, six distinct contextual OG PNG1200x630, actual404/308, private withdrawal/due schedules/sitemap. No demo fetch/page errors/overflow. Desktop/mobile list screenshots inspected: /private/tmp/lunabiner-products-public-qa-56kAoI; section/card/spacing/teal-orange identity unchanged.
- Disposable ContentEntry/User/AuditEvent final0; QA server/database stopped, no main server restart or data writes. Existing ignored backups retained.
- Observer hanya menghitung query dengan public eligibility predicate; query polling/refresh admin tidak tercampur. Cache invalidation archive/restore diukur sebelum public list dapat menghangatkan canary kembali.
- Harness refinement: Response.finished pada scheduled Server Action tertahan meskipun database sudah commit. Assertion memakai response status + bounded database version polling (bukan menunggu stream selesai), public fetch timeout15s; rerun production PASS. Dua fixture produk dan satu user QA dari run tertahan dibersihkan secara exact/validated pada database disposable, bukan main data; bisa dibuat ulang oleh suite.

## Batas dan Kendala

- Task7 QA final belum dikerjakan. Tidak ada deployment/SEO ranking atau load benchmark claim. DB tetap harus live; cache directory runtime writable/private, UTC clock sync dan production HTTPS origin memerlukan operator verification. Single-instance private disk/cache mengikuti batas existing.
- Tidak menjalankan LLM/embedding/demo external requests, tidak restart server utama3000, tidak push.
- No blocker Task6. Focused Conventional Commit setelah validation; AGENTS.md user changes, env/secrets/generated/cache/QA artifacts excluded. Task7 menunggu konfirmasi pengguna.
