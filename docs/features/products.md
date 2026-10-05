# Products — active scope, architecture and tracking

Tanggal: 2026-10-05. Active PRD: [PRD 002](../products/PRD/PRD_002_lunabiner-phase-2.md), confirmed Product CRUD scope, status IN PROGRESS. Task 1–3 selesai; upload/public/cache/final QA tetap Task 4–7.

## Refinement aktif — Task 3a Ringkasan-only dan fitur bilingual

Pengguna menyetujui menghapus field Detail ID/EN karena redundant. Target form memakai Ringkasan/excerpt sebagai satu sumber deskripsi card/detail/fallback SEO, maksimal 150 dan publication minimum 10. Override SEO tetap. Fitur dapat ditambah/hapus per bahasa, maksimal 12 poin/bahasa dan 100 karakter/poin; storage target `details.productFeatures: {id: string[], en: string[]}`. Tidak membuat body/richBody duplikat untuk PRODUCT baru setelah integrasi. Artikel dan portfolio unchanged.

Task 3a menyediakan pure `summary-content.ts`: strict content contract tanpa body/richBody, publication validation hanya Ringkasan, literal legacy feature fallback (bukan otomatis menerjemahkan teks arbitrary), dan migration preflight. Existing localized empty lists tetap kosong, tidak muncul kembali dari fallback. Read compatibility menerima panjang legacy existing dan tidak memotong. Preflight menahan body yang berbeda dari Ringkasan, formatting rich yang bukan plain paragraphs, serta konten melewati batas baru. Tidak menulis DB dan tidak menghapus data. Backup/conflict review wajib sebelum apply pada Task 3c.

**Runtime form/save/public dan seeder masih Task 3 existing**, belum memakai kontrak baru. Penjelasan textarea/detail/rich di bawah adalah implementasi runtime saat ini, bukan target akhir refinement. Tidak ada perubahan SQL/JSON database/RBAC/route pada Task 3a.

Execution refinement: 3a kontrak/adapter/tests COMPLETED → 3b UI/save/public existing integration NOT STARTED → 3c backup/migration/seed/browser QA NOT STARTED → Task 4–7 existing. [Task 3a report](../reports/2026/10/05/products_task3a_summary-contract.md).

## Pembaruan requirement setelah Task 2 — textarea produk

Pengguna menyetujui detail produk memakai textarea teks biasa ID/EN, bukan Tiptap, karena konten pendek/cenderung statis. Nama/title, ringkasan, readiness, CTA, cover dan SEO tetap field terpisah. Detail `/products/[slug]` tetap dalam scope; tidak turun menjadi daftar card saja. Tidak menambah rich formatting/Markdown/HTML editor produk atau mengubah editor portfolio.

Task 3 sudah menerapkan textarea dan trusted server adapter: body berasal dari teks input; representation rich internal direuse agar kontrak/storage existing kompatibel tanpa UI Tiptap. Pada record rich existing, perubahan field lain/teks yang tidak berubah menjaga richBody; perubahan teks yang disengaja memakai derived representation teks baru. Guard generic plain writes tetap melindungi konten.

Task 5 akan merender detail teks sebagai paragraf aman untuk konten baru, mempertahankan kompatibilitas data rich existing, dan tetap mengerjakan SEO per produk. Tidak ada janji ranking dari jenis editor. Task 3 tidak menambah SQL migration atau menghapus dukungan richBody/dependency Tiptap.

## Implementasi aktual — Task 3

- Menu `/dashboard/products` dengan aktif/arsip, create `/new`, edit UUID; generic CMS mengarahkan PRODUCT ke editor khusus dan creation generic hanya ARTICLE. Server pages/actions memakai content:read/write/publish, bukan sidebar sebagai authorization.
- Form ID/EN tanpa Tiptap: title, ringkasan, detail, SEO; ringkasan/detail masing-masing maksimal **150 karakter** dengan `maxLength`, counter dan validasi server. Publikasi tetap excerpt minimal 10/body minimal 30. Legacy lebih panjang tampil utuh dan boleh disimpan unchanged; perubahan teks harus memenuhi 150, tidak ada truncation/bulk migration.
- DRAFT/PUBLISHED/SCHEDULED langsung, schedule future UTC, readiness independen, kategori/tags/author dan CTA internal atau HTTPS. Input dipertahankan saat validation/conflict/permission gagal; pesan per field ramah. Published/scheduled read-only untuk editor tanpa content:publish.
- `form.ts` menolak file pada input teks dan tidak menerima richBody/image/features dari client. Trusted textarea service menjaga cover/features existing dan formatting rich unchanged; perubahan body disengaja diturunkan menjadi rich paragraphs. Validasi panjang kontekstual juga berlaku pada jalur save generic.
- Arsip/pulihkan terpisah, confirmation/cancel, optimistic version dan audit. Pulihkan menghasilkan DRAFT serta mempertahankan readiness/CTA/konten. Legacy ARCHIVED tanpa deletedAt tetap masuk arsip dan hanya dipulihkan eksplisit. Navigasi setelah action dilakukan sebelum RSC revalidation me-remount kontrol.
- Cover existing hanya preview; upload/replace/remove belum tersedia (Task 4). Public detail/CTA baru/SEO/cache belum final (Task 5–6).
- Migration foundation diterapkan ke database lokal `lunabiner` setelah private backup; dua contoh singkat ID/EN ditambahkan, empat route reservations, non-PRODUCT tetap identik. Seeder idempotent menjaga edit existing. Tidak ada migration SQL baru pada Task 3.
- QA browser production desktop/mobile, server actions, batas 150/151, permissions, legacy formatting, schedule/CTA dan archive/restore selesai. Lihat [Task 3 report](../reports/2026/10/05/products_task3_admin.md).

## Implementasi aktual — Task 2

- `src/features/products/schema.ts` menerima PRODUCT UUID/descriptive slug, publishing DRAFT/PUBLISHED/SCHEDULED, readiness COMING_SOON/BETA/LIVE melalui details.productStatus, rich ID/EN dan minima publication. Lifecycle adalah kontrak terpisah. Feedback aman per field/bahasa tersedia; integrasi form baru Task 3.
- `cta-schema.ts`: details.productCta discriminated internal locale-neutral path atau external HTTPS tanpa whitespace/backslash/credential/protocol lain. Default produk baru `/consultation`; legacy ctaPath ID/EN dinormalisasi tanpa mengganti tujuan yang sudah dikonfigurasi. Legacy fields tetap tersimpan, bukan dihapus dari database. Tidak ada server fetch URL eksternal.
- `legacy-content.ts`: read adapter mengubah plain body menjadi rich document tanpa write, menjaga formatting existing, features/readiness/CTA. Save menyimpan richBody dan derived plain body. Produk rich tidak boleh di-overwrite payload plain dari editor lama. `saveContent` untuk PRODUCT mendelegasikan ke product service; ARTICLE/CASE_STUDY workflow tetap.
- `service.ts`: requirePermission content:write pada save, content:publish untuk publishing/edit published/scheduled/archive/restore. Transaction/optimistic version dan AuditEvent product.create/update/archive/restore; archive deletedAt+ARCHIVED, restore DRAFT/null publishedAt, menjaga translations/details. Jadwal harus future UTC saat save; live resolver memfilter deletedAt/status/publishedAt lalu mengembalikan canonical slug dan redirect flag, bukan HTTP response/cache.
- Migration `20261005010000_product_foundation` menambah ProductRoute/reservation triggers dan ContentEntry.productRoutes relation; backfill additive/atomic. Canonical slug, UUID dan history berbagi namespace product, terpisah dari portfolio. Lihat [database schema](../database/schema.md).
- Seeder `npm run db:seed:products`: dua UUID tetap, Enterprise Chat/AI Cashflow PUBLISHED+COMING_SOON, rich ID/EN dari contoh existing dan CTA konsultasi. Satu transaction; existing UUID milik PRODUCT atau route slug reserved berarti preserved, bukan duplicate/overwrite/restore. UUID beda kind atau insert race/conflict menggagalkan transaction. Tidak ada akun/seed otomatis GET/build.
- Migration dan runner diuji di disposable PostgreSQL port 55441. **Database utama belum dimigrasikan/di-seed pada Task 2**; activation/restart harus dijalankan terarah sebelum menu produk Task 3 digunakan. Tidak menghapus atau mengubah data utama.
- Pada akhir Task 2 UI khusus belum tersedia. Task 3 kini menyediakan admin/textarea; cover upload/product media, DB-only public detail/SEO/sitemap dan streaming cache tetap belum tersedia. Public Products existing belum membaca CTA baru/detail dan masih memakai fallback.

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

Feature `src/features/products/` memiliki kontrak, service/lifecycle, legacy adapter, seed, live resolver, actions/form/editor. Public rendering masih Task 5–6. Reuse CMS ContentEntry dan authorization/audit; portfolio tetap rich editor. Jangan memasukkan product-only rules ke portable architecture blueprint atau mengubah perilaku ARTICLE/CASE_STUDY tanpa kebutuhan terukur.

Database foundation Task 2: ProductRoute adalah namespace product sendiri, mengikuti jaminan ownership/history portfolio. UUID primary key, value unik/deskriptif atau UUID compatibility, contentId UUID FK restrict ke ContentEntry, createdAt dan index contentId; validation kind PRODUCT dan reservations immutable/transactional. Current slug dan UUID dicadangkan, slug lama tetap milik record meskipun diarsipkan. Namespace product tidak mengunci slug portfolio. Migration/backfill konflik atomik diuji pada disposable; activation main selesai Task 3. ContentEntry.productRoutes ditambahkan di Prisma; deletedAt/index publication existing direuse, tidak menambah enum publishing.

Shared contracts/service menerima rich PRODUCT dan membedakan direct status product dari ARTICLE workflow. Trusted product upload masih Task 4; generic CMS redirect tersedia. Existing legacy PRODUCT JSON/plain fields dipertahankan/diadaptasi. REVIEW dipetakan ke DRAFT saat explicit save; ARCHIVED hanya explicit restore, tidak dipublish otomatis.

### Publication vs readiness

Product editor hanya DRAFT/PUBLISHED/SCHEDULED, bukan REVIEW/ARCHIVED. Readiness COMING_SOON/BETA/LIVE independen: PUBLISHED+COMING_SOON valid, LIVE+DRAFT tetap privat. Future UTC schedule wajib saat save; due predicate berlaku setiap request, tanpa job yang mengubah enum. Arsip set deletedAt/status ARCHIVED melalui action khusus; restore DRAFT, mempertahankan kesiapan/body/cover. Publisher guard tetap berlaku; content editor tidak boleh memodifikasi public record tanpa content:publish.

### Admin/body/CTA

Menu `/dashboard/products`: aktif/arsip, create `/new`, edit UUID. Form title/excerpt/SEO ID/EN, textarea detail ID/EN, readiness dan publication/UTC schedule; cover file pada Task 4. Kategori/tags/basic metadata mengikuti pola yang relevan. Tidak ada panel narasi duplikat atau toolbar Tiptap. Minimum publikasi excerpt 10/body 30 karakter kedua bahasa; maksimum teks baru/edited excerpt/body 150. Legacy unchanged dan rich internal tetap memakai ceiling/allowlist storage existing (body 30.000). Validation friendly merujuk field textarea per bahasa; input dipertahankan saat gagal. Unchanged rich existing tidak dihapus otomatis.

CTA detail mempunyai tujuan konsultasi internal default atau HTTPS eksternal opsional, label ID/EN. Tidak wajib demo untuk BETA/LIVE. Kontrak membedakan tipe tujuan; URL menolak javascript/data/protocol-relative dan credential URL. Render external link aman (noopener/noreferrer bila new tab), tidak fetch URL di server. Legacy configured valid CTA harus diaudit/dipertahankan secara eksplisit saat adapter dibuat; default baru tidak boleh diam-diam menimpa configured CTA existing. Tidak menambahkan waitlist/payment/user account.

### Cover/media

Input perangkat mengikuti portfolio: JPEG/PNG/WebP statis maksimal 5 MiB, decode actual bytes, bounds dimensi, normalize WebP metadata-free, UUID asset/record. Namespace `/media/products/{contentId}/{assetId}` dan storage server-only privat/persistent, bukan public static directory. Ownership PRODUCT+current reference, anonymous hanya eligible; preview memerlukan content:read. No-store/noindex/nosniff, unoptimized upload dengan optimizer internal assets-only. Keep/replace/remove/cancel, cleanup failed unattached asset dan private retention old files mengikuti invariant portfolio. Pemisahan/reuse storage dilakukan hanya setelah compatibility review, tidak memperluas izin portfolio media kepada PRODUCT.

### Public/SEO/rendering

Daftar `/id/products`, `/en/products` menjadi database-only; card link detail slug, localized readiness badge, cover/nama/ringkasan. Empty/error state eksplisit. Detail menggunakan title/excerpt, readiness, cover, teks body paragraf dan CTA dengan kompatibilitas rich existing; intro copy tidak mengklaim seluruh katalog selalu COMING_SOON. Seeder dua konsep existing idempotent, fixed UUID, tidak overwrite admin edits/restore/publish existing; seed baru boleh tampil sebagai PUBLISHED+COMING_SOON dengan jelas konsep, bukan aplikasi siap pakai. Narasi default ID/EN hanya berasal dari informasi existing, tanpa mengarang sections/capabilities.

Metadata → OG → Twitter → Canonical → Schema mengikuti halaman/detail. Detail memakai schema sesuai fakta (CreativeWork/concept ketika belum tersedia), tanpa fabricated offers/pricing/review/rating. Registry dan schema contracts ditambah secara scoped, contextual branded OG; sitemap hanya eligible canonical product slugs, tidak alias/UUID/private/media. Route alias eligible 308; unknown/private 404 tanpa target/title leak. Guard metadata/canonical selesai sebelum response detail flush.

Pola rendering/cache mengikuti portfolio: static-independent list intro di luar query Suspense, stable list metadata, request memoization dan shared payload cache di belakang live inventory/route/revision guards. Invalidation sesudah save/archive/restore. Future schedule tidak tertahan TTL; cache/session/admin decisions tidak dicampur. PPR/ISR global, multi-instance coordination dan benchmark ranking tidak dijanjikan.

## Seeder dan verifikasi target

Enterprise Chat / AI Cashflow perlu slug enterprise-chat / ai-cashflow dan UUID tetap; konflik existing dianggap preserve/audit, bukan overwrite atau duplicate nomor baru. Seeder transaction/idempotency, existing content compatibility, publication/readiness separation, malformed CTA/rich/image input, slug races, version conflicts, role permissions, soft delete/restore, cache withdrawal dan HTTP/SEO diuji di disposable PostgreSQL saja. Seed main DB tidak otomatis saat GET/build/deploy; apply operational dilakukan eksplisit setelah seeder/task verified.

## Implementation plan dan tracking

1. Task 1 — audit arsitektur, keputusan data dan baseline: COMPLETED; typecheck, lint dan production build PASS.
2. Task 2 — schema/contracts/service/route reservations/seeder: COMPLETED; main activation dilakukan pada Task 3.
3. Task 3 — menu admin dan CRUD/textarea ID/EN/readiness/CTA/archive, adapter save kompatibel existing: COMPLETED; batas 150 dan browser desktop/mobile terverifikasi.
4. Task 4 — perangkat cover/private media: NOT STARTED.
5. Task 5 — public list/detail/SEO/OG/sitemap: NOT STARTED.
6. Task 6 — streaming/cache/invalidation: NOT STARTED.
7. Task 7 — final regression/browser/visual QA: NOT STARTED.

Execution order: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7. Hanya satu active task; perlu konfirmasi setelah report. Task tambahan in-scope memakai suffix, tidak merombak nomor yang selesai. [Task 1 report](../reports/2026/10/05/products_task1_architecture.md). PRD Phase 2 tetap IN PROGRESS walaupun product scope kelak selesai; unrelated waitlist/newsletter/RAG/production delivery tidak otomatis diaktifkan.
