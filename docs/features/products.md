# Products — active scope, architecture and tracking

Tanggal: 2026-10-05. Active PRD: [PRD 002](../products/PRD/PRD_002_lunabiner-phase-2.md), confirmed Product CRUD scope, status IN PROGRESS. Dokumen ini memisahkan fondasi Task 2 yang sudah tersedia, snapshot awal dan target Task 3–7.

## Implementasi aktual — Task 2

- `src/features/products/schema.ts` menerima PRODUCT UUID/descriptive slug, publishing DRAFT/PUBLISHED/SCHEDULED, readiness COMING_SOON/BETA/LIVE melalui details.productStatus, rich ID/EN dan minima publication. Lifecycle adalah kontrak terpisah. Feedback aman per field/bahasa tersedia; integrasi form baru Task 3.
- `cta-schema.ts`: details.productCta discriminated internal locale-neutral path atau external HTTPS tanpa whitespace/backslash/credential/protocol lain. Default produk baru `/consultation`; legacy ctaPath ID/EN dinormalisasi tanpa mengganti tujuan yang sudah dikonfigurasi. Legacy fields tetap tersimpan, bukan dihapus dari database. Tidak ada server fetch URL eksternal.
- `legacy-content.ts`: read adapter mengubah plain body menjadi rich document tanpa write, menjaga formatting existing, features/readiness/CTA. Save menyimpan richBody dan derived plain body. Produk rich tidak boleh di-overwrite payload plain dari editor lama. `saveContent` untuk PRODUCT mendelegasikan ke product service; ARTICLE/CASE_STUDY workflow tetap.
- `service.ts`: requirePermission content:write pada save, content:publish untuk publishing/edit published/scheduled/archive/restore. Transaction/optimistic version dan AuditEvent product.create/update/archive/restore; archive deletedAt+ARCHIVED, restore DRAFT/null publishedAt, menjaga translations/details. Jadwal harus future UTC saat save; live resolver memfilter deletedAt/status/publishedAt lalu mengembalikan canonical slug dan redirect flag, bukan HTTP response/cache.
- Migration `20261005010000_product_foundation` menambah ProductRoute/reservation triggers dan ContentEntry.productRoutes relation; backfill additive/atomic. Canonical slug, UUID dan history berbagi namespace product, terpisah dari portfolio. Lihat [database schema](../database/schema.md).
- Seeder `npm run db:seed:products`: dua UUID tetap, Enterprise Chat/AI Cashflow PUBLISHED+COMING_SOON, rich ID/EN dari contoh existing dan CTA konsultasi. Satu transaction; existing UUID milik PRODUCT atau route slug reserved berarti preserved, bukan duplicate/overwrite/restore. UUID beda kind atau insert race/conflict menggagalkan transaction. Tidak ada akun/seed otomatis GET/build.
- Migration dan runner diuji di disposable PostgreSQL port 55441. **Database utama belum dimigrasikan/di-seed pada Task 2**; activation/restart harus dijalankan terarah sebelum menu produk Task 3 digunakan. Tidak menghapus atau mengubah data utama.
- Admin Products/Tiptap UI, cover upload/product media, DB-only public detail/SEO/sitemap dan streaming cache belum tersedia. Generic editor lama masih plain dan menawarkan REVIEW/ARCHIVED yang product service menolak; setelah rich save gunakan editor khusus yang akan dibuat Task 3. Public Products existing belum membaca CTA baru/rich detail dan masih memakai fallback; jangan menganggap fondasi ini sebagai UI final.

## Snapshot sebelum implementasi (Task 1)

- ContentEntry sudah menyimpan PRODUCT dengan UUID, slug unik per kind, translations/details JSON, version, publishedAt dan deletedAt. Tidak perlu tabel Products paralel.
- Generic `/dashboard/content` bisa membuat/edit PRODUCT plain text. Belum ada menu/editor Products khusus, rich body product ditolak shared schema, ordinary publication masih memakai transisi REVIEW dan ARCHIVED ada pada generic status choices.
- Readiness COMING_SOON/BETA/LIVE sudah berada di details.productStatus. CTA hanya path internal di details.ctaPath; label ID/EN ada. Shared features berupa string array, bukan rich sections product.
- `/id/products` dan `/en/products` mengambil eligible PRODUCT melalui CMS, tetapi fallback website.products masih muncul saat inventory kosong. Cards CMS menampilkan kesiapan, judul, excerpt/features dan CTA langsung. Belum ada `/products/[slug]`, product cover upload, ProductRoute, product-specific persistent cache atau seed runner product.
- Existing SEO memiliki bundle editorial collection Products dan OG list; belum ada detail resolver/schema/OG/sitemap product. Portfolio sudah menggunakan streaming SSR + guarded public payload cache; flag Cache Components nonaktif. Product scope tidak mengulang migrasi PPR global.
- Contoh existing: Enterprise Chat dan AI Cashflow, saat ini preview konsep statis. Tidak mengklaim produk aktif, customer/pricing atau demo yang belum dikonfirmasi.

## Keputusan arsitektur dan target lanjutan

Bagian ini mencatat keputusan keseluruhan. Status runtime per bagian mengacu pada implementasi aktual di atas; khusus upload/UI/public/cache tetap Task 3–7.

### Ownership/domain

Feature `src/features/products/` sudah memiliki kontrak, service/lifecycle, legacy adapter, seed dan live resolver. Actions/editor/public rendering masih Task 3–6. Reuse CMS ContentEntry, rich editor/renderer, authorization/audit dan image validation primitives melalui boundaries yang jelas. Jangan memasukkan product-only rules ke portable architecture blueprint atau mengubah perilaku ARTICLE/CASE_STUDY tanpa kebutuhan terukur.

Database foundation Task 2: ProductRoute adalah namespace product sendiri, mengikuti jaminan ownership/history portfolio. UUID primary key, value unik/deskriptif atau UUID compatibility, contentId UUID FK restrict ke ContentEntry, createdAt dan index contentId; validation kind PRODUCT dan reservations immutable/transactional. Current slug dan UUID dicadangkan, slug lama tetap milik record meskipun diarsipkan. Namespace product tidak mengunci slug portfolio. Migration/backfill konflik atomik sudah diuji pada disposable; activation main belum dilakukan. ContentEntry.productRoutes ditambahkan di Prisma; deletedAt/index publication yang sudah ada direuse, tidak menambah enum publishing.

Shared contracts/service sudah menerima rich PRODUCT dan membedakan direct status product dari ARTICLE workflow. Trusted product upload masih Task 4; generic CMS redirect ke editor khusus Task 3. Existing legacy PRODUCT JSON/plain fields dipertahankan/diadaptasi, bukan wholesale replacement. REVIEW/ARCHIVED legacy tidak dipublish otomatis; editor mapping akan diverifikasi sebelum rollout.

### Publication vs readiness

Product editor hanya DRAFT/PUBLISHED/SCHEDULED, bukan REVIEW/ARCHIVED. Readiness COMING_SOON/BETA/LIVE independen: PUBLISHED+COMING_SOON valid, LIVE+DRAFT tetap privat. Future UTC schedule wajib saat save; due predicate berlaku setiap request, tanpa job yang mengubah enum. Arsip set deletedAt/status ARCHIVED melalui action khusus; restore DRAFT, mempertahankan kesiapan/body/cover. Publisher guard tetap berlaku; content editor tidak boleh memodifikasi public record tanpa content:publish.

### Admin/body/CTA

Menu `/dashboard/products`: aktif/arsip, create `/new`, edit UUID. Form title/excerpt/SEO ID/EN, Tiptap detail ID/EN, readiness, publication/UTC schedule dan cover file; kategori/tags/basic metadata mengikuti pola yang relevan. Tidak menambahkan panel narasi duplikat. Minimum publikasi mengikuti portfolio (excerpt 10 karakter/body 30 karakter teks kedua bahasa), rich JSON limits/allowlist sama. Validation friendly per kolom/bahasa dan input dipertahankan saat gagal.

CTA detail mempunyai tujuan konsultasi internal default atau HTTPS eksternal opsional, label ID/EN. Tidak wajib demo untuk BETA/LIVE. Kontrak membedakan tipe tujuan; URL menolak javascript/data/protocol-relative dan credential URL. Render external link aman (noopener/noreferrer bila new tab), tidak fetch URL di server. Legacy configured valid CTA harus diaudit/dipertahankan secara eksplisit saat adapter dibuat; default baru tidak boleh diam-diam menimpa configured CTA existing. Tidak menambahkan waitlist/payment/user account.

### Cover/media

Input perangkat mengikuti portfolio: JPEG/PNG/WebP statis maksimal 5 MiB, decode actual bytes, bounds dimensi, normalize WebP metadata-free, UUID asset/record. Namespace `/media/products/{contentId}/{assetId}` dan storage server-only privat/persistent, bukan public static directory. Ownership PRODUCT+current reference, anonymous hanya eligible; preview memerlukan content:read. No-store/noindex/nosniff, unoptimized upload dengan optimizer internal assets-only. Keep/replace/remove/cancel, cleanup failed unattached asset dan private retention old files mengikuti invariant portfolio. Pemisahan/reuse storage dilakukan hanya setelah compatibility review, tidak memperluas izin portfolio media kepada PRODUCT.

### Public/SEO/rendering

Daftar `/id/products`, `/en/products` menjadi database-only; card link detail slug, localized readiness badge, cover/nama/ringkasan. Empty/error state eksplisit. Detail menggunakan title/excerpt, readiness, cover, rich body dan CTA; intro copy tidak mengklaim seluruh katalog selalu COMING_SOON. Seeder dua konsep existing idempotent, fixed UUID, tidak overwrite admin edits/restore/publish existing; seed baru boleh tampil sebagai PUBLISHED+COMING_SOON dengan jelas konsep, bukan aplikasi siap pakai. Narasi default ID/EN hanya berasal dari informasi existing, tanpa mengarang sections/capabilities.

Metadata → OG → Twitter → Canonical → Schema mengikuti halaman/detail. Detail memakai schema sesuai fakta (CreativeWork/concept ketika belum tersedia), tanpa fabricated offers/pricing/review/rating. Registry dan schema contracts ditambah secara scoped, contextual branded OG; sitemap hanya eligible canonical product slugs, tidak alias/UUID/private/media. Route alias eligible 308; unknown/private 404 tanpa target/title leak. Guard metadata/canonical selesai sebelum response detail flush.

Pola rendering/cache mengikuti portfolio: static-independent list intro di luar query Suspense, stable list metadata, request memoization dan shared payload cache di belakang live inventory/route/revision guards. Invalidation sesudah save/archive/restore. Future schedule tidak tertahan TTL; cache/session/admin decisions tidak dicampur. PPR/ISR global, multi-instance coordination dan benchmark ranking tidak dijanjikan.

## Seeder dan verifikasi target

Enterprise Chat / AI Cashflow perlu slug enterprise-chat / ai-cashflow dan UUID tetap; konflik existing dianggap preserve/audit, bukan overwrite atau duplicate nomor baru. Seeder transaction/idempotency, existing content compatibility, publication/readiness separation, malformed CTA/rich/image input, slug races, version conflicts, role permissions, soft delete/restore, cache withdrawal dan HTTP/SEO diuji di disposable PostgreSQL saja. Seed main DB tidak otomatis saat GET/build/deploy; apply operational dilakukan eksplisit setelah seeder/task verified.

## Implementation plan dan tracking

1. Task 1 — audit arsitektur, keputusan data dan baseline: COMPLETED; typecheck, lint dan production build PASS.
2. Task 2 — schema/contracts/service/route reservations/seeder: COMPLETED; migrasi/seeder/regresi diverifikasi pada database disposable, main activation belum dilakukan.
3. Task 3 — menu admin dan CRUD/Tiptap/readiness/CTA/archive: NOT STARTED.
4. Task 4 — perangkat cover/private media: NOT STARTED.
5. Task 5 — public list/detail/SEO/OG/sitemap: NOT STARTED.
6. Task 6 — streaming/cache/invalidation: NOT STARTED.
7. Task 7 — final regression/browser/visual QA: NOT STARTED.

Execution order: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7. Hanya satu active task; perlu konfirmasi setelah report. Task tambahan in-scope memakai suffix, tidak merombak nomor yang selesai. [Task 1 report](../reports/2026/10/05/products_task1_architecture.md). PRD Phase 2 tetap IN PROGRESS walaupun product scope kelak selesai; unrelated waitlist/newsletter/RAG/production delivery tidak otomatis diaktifkan.
