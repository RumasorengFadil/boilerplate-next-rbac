# Products — active scope, architecture and tracking

Tanggal: 2026-10-05. Active PRD: [PRD 002](../products/PRD/PRD_002_lunabiner-phase-2.md), overall IN PROGRESS. Scope Product CRUD: COMPLETED (Task1–7 dan refinement3a–3c). Bagian tahap sebelumnya adalah snapshot; runtime Task6 dan Ringkasan-only Task3b/3c adalah perilaku sekarang.

## Final acceptance — Task 7

- 91/91 scoped serial tests, typecheck/lint/build PASS. Production admin3010/public3011/SEO HTTP55445/cache3012 semuanya PASS, hanya database disposable. UUID/slug/seed/version/audit/RBAC, direct statuses/readiness independen, Ringkasan150/features12x100 IDEN, retained friendly failed forms, legacy preservation/migration/backup/restore dan device cover/private media teruji.
- Public DB-only empty/error/detail/CTA/cover/readiness/IDEN, full metadata/OG/Twitter/canonical/schema/sitemap dan actual404/308 teruji. SEO HTTP22 public routes/root lang/hreflang/private noindex/robots PASS. Cache production SQL cold1/warm0/live guards, actual post-commit tag expiry save/archive/restore, intro-before-query, warm privacy dan real-clock due schedule PASS; tidak mengklaim PPR/ISR.
- Desktop/mobile screenshots inspected: admin /private/tmp/lunabiner-products-admin-qa-BWKKWZ; public /private/tmp/lunabiner-products-public-qa-R8gVB7. Section/card/grid/spacing/typography mengikuti adaptasi BisaDev, logo/teal-orange/content LunaBiner tetap. Synthetic noise/teal covers hanya fixture QA, bukan production asset.
- Main3000 GET-only products IDEN dan existing Enterprise Chat/AI Cashflow detail200 dengan satu canonical/H1/schema. Tidak ada main writes/restart/migration/seed. Disposable ContentEntry/User/AuditEvent/ProductRoute/PortfolioRoute final0; QA servers/database stopped, temp covers cleaned, screenshots retained. No LLM/embedding/demo fetch.
- Tidak ada task implementasi CRUD produk tersisa dalam scope yang disetujui. Review pengguna dan operator production origin/deploy/private volume/cache/UTC/backup-restore tetap terpisah. Waitlist/pricing/apps/newsletter/CMS→RAG/gallery/cloud/multi-instance/search-pagination tetap deferred. [Final report](../reports/2026/10/05/products_task7_final-qa.md).

## Runtime — Task 6 streaming/cache/invalidation

- List intro/CTA tidak menunggu database. Suspense menampilkan status Memuat produk/Loading products, kemudian cards dan collection JSON-LD; query failure tetap alert dengan graph tanpa invented items. Stable list metadata tidak membaca inventory.
- `publishedProducts` request memoization menyatukan list/schema. Inventory eligible selalu live; `productRevisionContent` memakai persistent Next payload cache TTL300/tag `products-public`, keyed by UUID/version/updatedAt dan SHA256 database source (bukan credential plaintext). Payload miss dibatasi exact revisions dan public eligibility; tanggal direhidrasi menjadi Date dan urutan inventory dipertahankan.
- ProductRoute dan eligibility/revision/slug detail selalu live sebelum cache. Metadata/page share resolver; detail/OG menyelesaikan guard sebelum render/redirect. Draft/review/future/archive/unknown404 tanpa title/canonical leak; eligible history/UUID308. Warm cache tidak menggantikan database yang gagal; due schedule langsung eligible tanpa menunggu TTL atau background status job.
- Product save/archive/restore dan generic CMS PRODUCT save menjalankan `updateTag` setelah transaksi berhasil, disertai invalidasi path existing. Tag expiry bukan stale-while-revalidate. Readiness/CTA/features/title/SEO/cover reference memakai revision terbaru; private media tetap live/no-store, bukan payload/image optimizer cache.
- Cache Components OFF: streaming SSR + guarded payload cache, bukan PPR/ISR. Tidak ada SQL migration/main writes/auto-seed/global cache flags. QA menggunakan database disposable, actual production SQL observer dan browser. Task7 QA final terpisah.
- Verification89/89 tests/typecheck/lint/build PASS; production3012 cold/warm SQL1→0, unchanged canary expiry after save/archive/restore, intro-before-locked-query, warm-cache privacy/actual due clock/404/308/SEO PASS. Public production3011 desktop/mobile and localized detail/cover/CTA/schema/OG/sitemap PASS; screenshots inspected at /private/tmp/lunabiner-products-public-qa-56kAoI. Disposable fixtures0; database QA stopped. [Task6 report](../reports/2026/10/05/products_task6_rendering-cache.md).

## Runtime — Task 5 public product/SEO

- List `/id/products`, `/en/products` hanya DB eligible, max200 sesuai card collection existing. Static website.products tidak dipakai sebagai fallback. Empty menampilkan belum ada produk; query/schema/data failure menampilkan pesan unavailable tanpa invent inventory/ItemList. Halaman error list tetap HTML200 berisi alert; detail/OG/sitemap error DB tidak disamarkan sebagai404/fallback. Intro tidak mengklaim semua produk masih konsep. Card berisi cover, localized readiness, title/Ringkasan/features dan tautan slug detail, bukan CTA demo langsung.
- Detail `/{locale}/products/{slug}` memakai title/Ringkasan sekali, cover yang sama, fitur ID/EN, readiness dan CTA internal/HTTPS tervalidasi. COMING_SOON menjelaskan konsep dan perlunya konfirmasi, bukan produk aktif. BETA/LIVE label Beta/Tersedia (Available), independen publishing. Legacy body/rich tetap readable/stored untuk safety tetapi tidak dirender menjadi deskripsi duplikat; Ringkasan authoritative. No Tiptap/gallery/pricing/reviews/sections fiktif. External CTA target_blank/noopener/noreferrer, tidak di-fetch atau auto-navigate; default internal locale-neutral /consultation.
- Snapshot Task5 memakai request memoization; Task6 menambahkan persistent payload cache dan streaming seperti bagian runtime di atas. Metadata/page/schema tetap memakai hasil yang sama dan detail guard selesai sebelum render agar status404/308 benar.
- Metadata lengkap melalui existing buildSeo; localized SEO overrides atau visible title/Ringkasan fallback, product name/category/tags keywords, canonical/hreflang/x-default, branded unique OG/Twitter image per slug+locale. Registry list stable/generic, tidak mencantumkan static concepts ketika inventory kosong. Collection schema menautkan actual eligible canonical products; detail WebPage+CreativeWork Concept/Beta/Released dan actual dates/Organization references. Tidak memakai offers/pricing/rating/SoftwareApplication capability fiktif.
- Public GET `/{locale}/products/{slug}/opengraph-image/main` Node force-dynamic1200x630 PNG/no-store. Local logo public/images/lunabiner-logo.png, localized headline/category/description, tidak mengambil private cover/demo/external image. Invalid/private404, eligible aliases308 ke canonical image, errors propagate500. Sitemap dynamic mencakup PRODUCT eligible/current slug dengan real updatedAt dan ID/EN alternates, tanpa cap200; tidak alias/UUID/media/future/draft/arsip. No new mutations/migration/API upload.
- Verification:84/84 regression, typecheck/lint/build PASS. Production public HTTP/browser3011:empty/catalog, actual404/308/withdrawal/due schedule, six distinct PNGs, schema/canonical/CTA/cover IDEN; desktop1440/mobile390 no overflow/page errors/demo fetch. Admin/cover browser3010 PASS. Main read-only enterprise-chat ID dan ai-cashflow EN200 tanpa restart/reseed. Artifacts `/private/tmp/lunabiner-products-public-qa-df8jfi`, admin `/private/tmp/lunabiner-products-admin-qa-cHZrX1`. Fixtures/temp uploads cleaned; report [Task5](../reports/2026/10/05/products_task5_public-seo.md).

## Runtime — Task 4 perangkat cover/private media

Editor create/edit menerima file JPG/PNG/WebP dari perangkat, bukan path teks. Preview blob lokal, keep/replace/remove/cancel; File dipertahankan dalam state untuk retry setelah native form reset. Form menyampaikan `coverOperation` dan `coverFile`; `image` client diabaikan. Pesan error cover inline accessible. Read-only/disabled mengikuti izin/pending existing, bukan menggantikan authorization server.

Action content:write memvalidasi teks/operation, membuat UUID content untuk create dan UUID asset, menormalisasi bytes lewat Sharp, lalu service versioned/transaction/audit menautkan `details.image` dengan trusted options. Replace path harus namespace products dan content UUID yang sama; generic writes tidak dapat menautkan uploaded asset arbitrary. Keep membaca DB, remove hanya melepas referensi. Audit product.create/update kini mencatat image sebelum/sesudah tanpa filename asli/bytes. Gagal mutasi menghapus file baru hanya setelah DB memastikan belum attached; kegagalan ambigu mempertahankan orphan privat. File lama tetap ada dan tidak disajikan setelah replace/remove; archive/restore mempertahankan cover.

Validasi/normalisasi serta private filesystem factory direuse dari module cover portfolio, tanpa berbagi permission/route/namespace/root. Portfolio exports/perilaku tetap kompatibel. Product wrapper memilih PRODUCT_UPLOAD_DIR/default storage/product-covers dan namespace `/media/products/`. Shared CMS read schema menerima kedua path UUID; write boundary menolak cross-kind. Tidak ada SQL migration/seed/auto upload.

Media GET `/media/products/{content UUID}/{asset UUID}` (Node, force-dynamic): validasi UUID; query kind PRODUCT + current details.image; anonymous hanya nondeleted PUBLISHED/due SCHEDULED (readiness tidak mempengaruhi akses). DRAFT/future/arsip memerlukan content:read. Unknown, invalid, obsolete, cross-kind atau unauthorized: 404 tanpa URL/title leak; storage/DB failure: 503. Berhasil: WebP bytes + Content-Length; semua respons private/no-store, nosniff, noindex. Tidak ada endpoint upload terpisah; Server Action multipart berada pada halaman editor. Invalid cover mendapat ProductState.fieldErrors.coverFile; conflicts/permission/status memakai feedback existing.

Thumbnail card publik existing ID/EN memakai cover yang sama, alt nama produk dan unoptimized untuk uploaded media; layout card/grid/teal tetap. Produk belum mempunyai route detail baru/CTA baru/OG per produk hingga Task5. Empty/static fallback existing masih Task5. Optimizer hanya menerima /images/**; jangan cache media privat melalui optimizer/CDN. Aturan storage/backup/limits di [installation](../deployment/installation.md).

Verifikasi:83/83 regresi serial, typecheck/lint/build PASS. Production product browser3010:multipart >1MiB, retry retained File/preview, cancel/replace/remove, thumbnail ID/EN, private schedule/arsip, optimizer400, desktop/mobile tanpa overflow. Existing portfolio cover browser3008 PASS setelah shared helper reuse. DB/upload synthetic disposable saja, fixtures/temp uploads dibersihkan; screenshot lokal `/private/tmp/lunabiner-products-admin-qa-vuqle2`. [Task4 report](../reports/2026/10/05/products_task4_cover-upload.md).

## Refinement aktif — Task 3a Ringkasan-only dan fitur bilingual

Pengguna menyetujui menghapus field Detail ID/EN karena redundant. Target form memakai Ringkasan/excerpt sebagai satu sumber deskripsi card/detail/fallback SEO, maksimal 150 dan publication minimum 10. Override SEO tetap. Fitur dapat ditambah/hapus per bahasa, maksimal 12 poin/bahasa dan 100 karakter/poin; storage target `details.productFeatures: {id: string[], en: string[]}`. Tidak membuat body/richBody duplikat untuk PRODUCT baru setelah integrasi. Artikel dan portfolio unchanged.

Task 3a menyediakan pure `summary-content.ts`: strict content contract tanpa body/richBody, publication validation hanya Ringkasan, literal legacy feature fallback (bukan otomatis menerjemahkan teks arbitrary), dan migration preflight. Existing localized empty lists tetap kosong, tidak muncul kembali dari fallback. Read compatibility menerima panjang legacy existing dan tidak memotong. Preflight menahan body yang berbeda dari Ringkasan, formatting rich yang bukan plain paragraphs, serta konten melewati batas baru. Tidak menulis DB dan tidak menghapus data. Backup/conflict review wajib sebelum apply pada Task 3c.

Task 3a tidak mengubah runtime. **Task 3b memakai form/save Ringkasan-only dan fitur bilingual; Task 3c sudah menyelesaikan seeder/migrasi lokal**. Penjelasan textarea/detail/rich pada bagian Task 3 di bawah adalah snapshot sebelum refinement, bukan UI sekarang. Tidak ada SQL migration/RBAC/route baru.

Execution refinement:3a–3c COMPLETED → Task4 COMPLETED → Task5 COMPLETED → Task6–7 NOT STARTED. [Task 3a report](../reports/2026/10/05/products_task3a_summary-contract.md).

## Runtime/data refinement — Task 3c

Seeder baru summary-only, fitur bilingual melalui `examples.ts` dengan fixed UUID, PUBLISHED+COMING_SOON; existing UUID/route tetap preserved. Service summary tidak menciptakan kembali features/body/richBody setelah cleanup. Legacy yang dipulihkan tetap kompatibel hingga explicit migrasi berikutnya.

`content-migration.ts`/CLI operator menyediakan preview/apply/restore lokal: PRODUCT saja, Serializable + advisory lock + version/audit, max10.000 rows, private backup10MB limit. Canonical JSON comparison mengabaikan urutan key; richDocumentSchema normalizes default representation sebelum membandingkan plain rich. Distinct text, heading/marks/links dan invalid/oversized content tetap konflik, bukan force-delete. Backup schema memverifikasi after sebagai hasil converter deterministic; restore menolak target/version/JSON mismatch dan menambah version, bukan rewind status/version.

Apply lokal 2026-10-05: dua produk contoh version1→2, translations body/richBody dan details.features redundant dihapus; productFeatures ID/EN tersimpan. Translations summary/SEO, details lain, UUID/status/readiness/CTA/cover/routes tetap. Terjemahan known hanya jika UUID contoh + array legacy English exact-match + belum ada productFeatures; configured list (termasuk kosong) dan arbitrary legacy tidak ditimpa. Backup ignored `.local-backups/product-summary/eb53b1ab-b8fb-4db8-b342-c5c378e9f57a.json` tetap disimpan (0700/0600/fsync/read-back validated); restore diuji hanya disposable, bukan main. Repeat preview0changes/0conflicts, seed0created/2preserved. Non-PRODUCT unchanged.

80/80 regresi, build/typecheck/lint dan production browser QA PASS; lokal public ID/EN 200 dengan localized features. [Task 3c report](../reports/2026/10/05/products_task3c_data-migration.md). Lihat [installation](../deployment/installation.md) untuk deployment lain. Tidak ada SQL migration, auto GET/build writes, upload/detail/cache task baru.

## Runtime refinement — Task 3b

- Field Detail ID/EN dihapus; hanya Ringkasan (150, publication minimum 10) dan SEO overrides. Fitur per bahasa memiliki tambah/hapus, counter, limit 12x100, label/error accessible dan state tetap saat save gagal. Client keys poin baru UUID; record tetap UUID existing. Tidak memakai Tiptap.
- `summary-input.ts` memvalidasi boundary baru tanpa body minimum; action menerima title/excerpt/SEO, repeated `id.feature`/`en.feature`, metadata/readiness/CTA/status/UTC. File dalam field teks ditolak. Client image/features legacy/kind/body/richBody diabaikan; direct contract menolak body/richBody.
- Trusted summary mode memakai RBAC/transaction/version/audit existing. Produk baru tidak menyimpan body/richBody. Produk existing menjaga legacy body/richBody persis dan cover/metadata; localized features authoritative, termasuk [] ketika admin menghapus semuanya. Legacy single-array features masih retained hingga backup migration 3c, tetapi tidak mengalahkan configured localized array.
- Generic legacy writes diblokir pada record yang sudah memiliki productFeatures agar tidak menghapus konfigurasi bilingual. Shared CMS hanya menambah optional storage reader `productFeatures`; non-PRODUCT input tidak boleh memakai field tersebut. Aturan publication artikel/portfolio unchanged.
- Public card existing memilih fitur berdasarkan locale, lalu fallback legacy bila localized configuration belum ada. Ringkasan tetap deskripsi. Layout publik tidak berubah; detail/SEO baru, DB-only fallback removal dan cache masih Task 5–6.
- Tidak menjalankan bulk update/seed/migration database utama. Terjemahan seed known, penghapusan legacy redundant JSON dan backup/conflict review menunggu 3c. Existing legacy summary/features yang melampaui batas ditampilkan utuh; save baru meminta disesuaikan, tidak truncate otomatis.

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

Feature `src/features/products/` memiliki kontrak, service/lifecycle, legacy adapter, seed, live resolver, actions/form/editor/public-data/presentation. Public rendering Task5 dan guarded cache/streaming Task6 tersedia. Reuse CMS ContentEntry dan authorization/audit; portfolio tetap rich editor. Jangan memasukkan product-only rules ke portable architecture blueprint atau mengubah perilaku ARTICLE/CASE_STUDY tanpa kebutuhan terukur.

Database foundation Task 2: ProductRoute adalah namespace product sendiri, mengikuti jaminan ownership/history portfolio. UUID primary key, value unik/deskriptif atau UUID compatibility, contentId UUID FK restrict ke ContentEntry, createdAt dan index contentId; validation kind PRODUCT dan reservations immutable/transactional. Current slug dan UUID dicadangkan, slug lama tetap milik record meskipun diarsipkan. Namespace product tidak mengunci slug portfolio. Migration/backfill konflik atomik diuji pada disposable; activation main selesai Task 3. ContentEntry.productRoutes ditambahkan di Prisma; deletedAt/index publication existing direuse, tidak menambah enum publishing.

Shared contracts/service menerima legacy rich PRODUCT dan membedakan direct status product dari ARTICLE workflow. Trusted product upload Task4 tersedia; generic CMS redirect tersedia. Existing legacy PRODUCT JSON/plain fields dipertahankan/diadaptasi. REVIEW dipetakan ke DRAFT saat explicit save; ARCHIVED hanya explicit restore, tidak dipublish otomatis.

### Publication vs readiness

Product editor hanya DRAFT/PUBLISHED/SCHEDULED, bukan REVIEW/ARCHIVED. Readiness COMING_SOON/BETA/LIVE independen: PUBLISHED+COMING_SOON valid, LIVE+DRAFT tetap privat. Future UTC schedule wajib saat save; due predicate berlaku setiap request, tanpa job yang mengubah enum. Arsip set deletedAt/status ARCHIVED melalui action khusus; restore DRAFT, mempertahankan kesiapan/body/cover. Publisher guard tetap berlaku; content editor tidak boleh memodifikasi public record tanpa content:publish.

### Admin/body/CTA

Menu `/dashboard/products`: aktif/arsip, create `/new`, edit UUID. Form title/Ringkasan/SEO IDEN, localized features12x100, readiness dan publication/UTC schedule; cover file tersedia. Kategori/tags/basic metadata existing. Tidak ada Detail terpisah/Tiptap. Publikasi Ringkasan minimum10/maksimum150 kedua bahasa, tanpa body minimum baru. Legacy rich/metadata readable dan retained jika belum dimigrasikan; validation friendly, input dipertahankan saat gagal. Unchanged legacy rich tidak dihapus otomatis.

CTA detail mempunyai tujuan konsultasi internal default atau HTTPS eksternal opsional, label ID/EN. Tidak wajib demo untuk BETA/LIVE. Kontrak membedakan tipe tujuan; URL menolak javascript/data/protocol-relative dan credential URL. Render external link aman (noopener/noreferrer bila new tab), tidak fetch URL di server. Legacy configured valid CTA harus diaudit/dipertahankan secara eksplisit saat adapter dibuat; default baru tidak boleh diam-diam menimpa configured CTA existing. Tidak menambahkan waitlist/payment/user account.

### Cover/media

Input perangkat mengikuti portfolio: JPEG/PNG/WebP statis maksimal 5 MiB, decode actual bytes, bounds dimensi, normalize WebP metadata-free, UUID asset/record. Namespace `/media/products/{contentId}/{assetId}` dan storage server-only privat/persistent, bukan public static directory. Ownership PRODUCT+current reference, anonymous hanya eligible; preview memerlukan content:read. No-store/noindex/nosniff, unoptimized upload dengan optimizer internal assets-only. Keep/replace/remove/cancel, cleanup failed unattached asset dan private retention old files mengikuti invariant portfolio. Pemisahan/reuse storage dilakukan hanya setelah compatibility review, tidak memperluas izin portfolio media kepada PRODUCT.

### Public/SEO/rendering

Daftar `/id/products`, `/en/products` database-only; card link detail slug, localized readiness badge, cover/nama/Ringkasan. Empty/error state eksplisit. Detail menggunakan title/Ringkasan/readiness/cover/features/CTA tanpa body duplikat; intro tidak mengklaim seluruh katalog COMING_SOON. Legacy rich/read compatibility tetap, tidak auto cleanup pada GET. Seeder existing idempotent fixedUUID, tidak overwrite admin edits/restore/publish; seed PUBLISHED+COMING_SOON konsep, bukan aplikasi siap pakai. Tidak mengarang sections/capabilities.

Metadata → OG → Twitter → Canonical → Schema mengikuti halaman/detail. Detail memakai schema sesuai fakta (CreativeWork/concept ketika belum tersedia), tanpa fabricated offers/pricing/review/rating. Registry dan schema contracts ditambah secara scoped, contextual branded OG; sitemap hanya eligible canonical product slugs, tidak alias/UUID/private/media. Route alias eligible 308; unknown/private 404 tanpa target/title leak. Guard metadata/canonical selesai sebelum response detail flush.

Pola rendering/cache mengikuti portfolio: static-independent list intro di luar query Suspense, stable list metadata, request memoization dan shared payload cache di belakang live inventory/route/revision guards. Invalidation sesudah save/archive/restore. Future schedule tidak tertahan TTL; cache/session/admin decisions tidak dicampur. PPR/ISR global, multi-instance coordination dan benchmark ranking tidak dijanjikan.

## Seeder dan verifikasi target

Enterprise Chat / AI Cashflow perlu slug enterprise-chat / ai-cashflow dan UUID tetap; konflik existing dianggap preserve/audit, bukan overwrite atau duplicate nomor baru. Seeder transaction/idempotency, existing content compatibility, publication/readiness separation, malformed CTA/rich/image input, slug races, version conflicts, role permissions, soft delete/restore, cache withdrawal dan HTTP/SEO diuji di disposable PostgreSQL saja. Seed main DB tidak otomatis saat GET/build/deploy; apply operational dilakukan eksplisit setelah seeder/task verified.

## Implementation plan dan tracking

1. Task 1 — audit arsitektur, keputusan data dan baseline: COMPLETED; typecheck, lint dan production build PASS.
2. Task 2 — schema/contracts/service/route reservations/seeder: COMPLETED; main activation dilakukan pada Task 3.
3. Task 3 — menu admin dan CRUD/textarea ID/EN/readiness/CTA/archive, adapter save kompatibel existing: COMPLETED; batas 150 dan browser desktop/mobile terverifikasi.
4. Task 4 — perangkat cover/private media: COMPLETED.
5. Task 5 — public list/detail/SEO/OG/sitemap: COMPLETED.
6. Task 6 — streaming/cache/invalidation: COMPLETED.
7. Task 7 — final regression/browser/visual QA: COMPLETED.

Execution order: Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7. Hanya satu active task; perlu konfirmasi setelah report. Task tambahan in-scope memakai suffix, tidak merombak nomor yang selesai. [Task 1 report](../reports/2026/10/05/products_task1_architecture.md). PRD Phase 2 tetap IN PROGRESS walaupun product scope kelak selesai; unrelated waitlist/newsletter/RAG/production delivery tidak otomatis diaktifkan.
