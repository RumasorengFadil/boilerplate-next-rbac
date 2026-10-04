# Portfolio — kondisi aktual dan keputusan target

Tanggal audit: 2026-10-04. Requirement: [PRD 003](../products/PRD/PRD_003_portfolio-cms.md).
Dokumen ini membedakan implementasi saat ini dengan keputusan target. PRD 003 Task 2 menyediakan fondasi database/service dan Task 3 admin editor; PRD 004 Task 2 menghubungkan rich renderer. PRD 003 Task 4 mengaktifkan canonical slug routing, redirect URL lama dan DB-only public portfolio. Cache/PPR dan final QA masih Task 5–6.

## Refinement Tiptap single source — PRD 004

[PRD 004](../products/PRD/PRD_004_portfolio-tiptap-single-source.md) merekam perubahan requirement setelah PRD 003: narasi hanya Tiptap, dan key legacy yang sudah tidak dipakai dibuang dari database setelah konversi. Implementasi refinement terbagi menjadi Task 1 konverter/preview, Task 2 runtime integration dan Task 3 backup/apply/QA; bukan penomoran ulang task PRD 003.

Task 1 tersedia: `convertLegacyPortfolioContent` memvalidasi details/translations existing, mempertahankan rich nodes/marks, mengonversi plain body jika perlu, lalu menambahkan isi legacy yang belum tercakup sebagai H2/paragraf atau bullet list ID/EN. Pembandingan teks memakai normalisasi whitespace/NFC dan batas whitespace, bukan perbandingan heading saja. Existing teks yang telah direvisi admin dan berbeda dengan legacy akan tetap dipertahankan; nilai legacy berbeda ditambahkan untuk mencegah kehilangan informasi dan dapat dirapikan saat review editorial. Tidak memakai LLM untuk menebak kesamaan makna.

Output konverter menghapus hanya key industry/challenge/approach/solution/impact/before/after/architecture/capabilities/technology dan menurunkan plain body dari richBody. Field lain, SEO, format tulisan dan data sumber tidak diubah. Kedua bahasa harus lolos allowlist/batas rich content sebelum output siap. Tidak ada truncation otomatis.

`npm run db:preview:portfolio-content` hanya menghitung total, record dengan legacy keys, perubahan yang dapat dikonversi dan record invalid. Transaksi PostgreSQL READ ONLY/RepeatableRead; tidak ada mode apply, dump konten, kredensial atau external provider calls. Meliputi draft/arsip/deleted CASE_STUDY juga. Kegagalan koneksi/validasi tidak mengubah data.

Task 2 tersedia: `presentContent` menormalkan CASE_STUDY melalui konverter tanpa writes, sehingga editor ID/EN dan public memakai dokumen yang sama sebelum bulk migration. Save CASE_STUDY dan seed baru menyimpan richBody/derived body serta details tanpa sepuluh key legacy. Existing record berubah saat operator menyimpan; bulk cleanup lokal semua status telah selesai melalui Task 3. Field legacy yang sengaja dihapus admin dari editor tidak ditambahkan ulang dari previous details. Plain-editor write terhadap existing portfolio ditolak agar tidak menghilangkan default rich yang telah dikonversi. Generic ARTICLE/PRODUCT tidak menggunakan adapter ini.

`RichTextContent` merender JSON tervalidasi sebagai React server HTML dengan heading H2–H4, paragraf, lists, quotes, code, links, breaks dan rule; text di-escape, link allowlist diperiksa, tanpa dangerouslySetInnerHTML atau bundel Tiptap client pada public. CASE_STUDY memakai overview kiri (category/tags/credit dan verified client jika tersedia) dan rich content kanan; mobile vertikal. Sepuluh field legacy tidak dirender sebagai blok tambahan. Cover, features, gallery, relasi/CTA dan verification metadata existing tetap digunakan, bukan dihapus sebagai data tidak terpakai.

Kartu CMS portfolio menampilkan category, bukan industry legacy. SEO keywords memakai category/tags dan label domain, bukan capabilities legacy. Public route memakai slug canonical; UUID, numeric alias dan slug historis yang terpetakan redirect 308 hanya setelah pemiliknya lolos public predicate. Unknown/nonpublic menghasilkan 404, tanpa fallback. Sitemap hanya menyertakan slug canonical eligible. Seed tetap create-if-missing dan tidak overwrite existing edits, dengan category/tags dan narasi industry/capabilities dalam richBody.

Task 3 tersedia: CLI `db:migrate:portfolio-content` memerlukan tepat satu operasi `--apply` atau `--restore <backup>` dan konfirmasi `--database <nama>`. Hanya target loopback PostgreSQL; database/schema aktual harus sesuai konfigurasi. Apply memvalidasi semua CASE_STUDY (termasuk draft/arsip/deleted), membuat snapshot before/after privat sebelum writes, lalu update JSON/version dan audit dalam transaksi Serializable dengan advisory lock. Invalid content, kegagalan backup, atau race membatalkan seluruh writes; backup yang sudah tertulis tetap tersedia.

Backup `.local-backups/portfolio-content/<batch-uuid>.json` tidak di-commit; directory 0700, file 0600, exclusive create, fsync dan read-back validation sebelum commit. Backup berisi ID/version/JSON before/after dan identitas target tanpa password/API key. Raw error/content tidak dicetak CLI. Restore tervalidasi dan target-bound; menolak record yang versinya bukan versi hasil migrasi atau JSON saat ini tidak cocok dengan after snapshot. Restore hanya JSON, menambah version (tidak memundurkannya), dan mencatat audit; tidak mengubah workflow/routes. Tidak ada force overwrite atau auto-restore.

Pada database lokal `lunabiner`, batch `f5223b97-3cc5-475b-bcbb-ffeb2ec920b1` telah mengonversi 3 record. Hasil preview: 3 rows, 0 with legacy keys, 0 convertible changes, 0 invalid rows. Repeat apply: 0 migrated. Isi ID/EN tersimpan cocok dengan snapshot dan tiga audit `portfolio.content.migrate` tercatat. Sepuluh key benar-benar dibuang dari JSON database, bukan sekadar disembunyikan. Key JSON bukan kolom SQL; ContentEntry.details tetap digunakan metadata dan ARTICLE/PRODUCT. UUID/routes/status/publishedAt tetap dipertahankan. Instruksi backup/restore: [Installation](../deployment/installation.md).

## Kondisi aktual

- `ContentEntry` sudah memakai primary key UUID, unique `(kind, slug)`, index `(kind, status, publishedAt)`, JSON translations/details dan optimistic version.
- Menu Portfolio dan `/dashboard/portfolio` mengelola CASE_STUDY dengan Tiptap 3.31.4 ID/EN. Generic CMS mengarahkan case study ke editor khusus. Kontrak menerima `richBody` JSON per locale dan menghasilkan plain `body` dari JSON tersebut; artikel/produk tetap plain editor.
- Public work, homepage cards dan detail `[slug]` menggunakan eligible database CASE_STUDY saja. Empty DB tidak menampilkan fallback contoh hardcoded. UUID tetap identifier database/admin, bukan URL canonical public.
- `ContentEntry.deletedAt` membedakan soft delete dari status workflow ARCHIVED. Shared public predicate mengecualikan deleted records.
- `PortfolioRoute` mencadangkan slug/UUID/alias historis dalam satu namespace. Trigger database melindungi konflik slug, termasuk write melalui generic CMS. Tiga seed ilustratif telah dimasukkan ke database lokal.
- Cache Components belum diaktifkan. Root layout membaca request `headers()` untuk bahasa HTML; work dan sejumlah public/OG/sitemap routes memakai `force-dynamic`.
- React cache yang ada menduplikasi query per render, bukan cache data lintas request.

## Fondasi Task 2 yang telah diimplementasikan

- `src/features/portfolio/schema.ts`: descriptive slug (bukan nomor/UUID), CASE_STUDY contract, lifecycle input UUID/version/operation.
- `src/features/portfolio/service.ts`: `savePortfolio` (content:write + publisher guard CMS), `changePortfolioLifecycle` (content:publish), dan `resolvePublishedPortfolio` (server-only public lookup).
- Archive menyetel deletedAt, ARCHIVED, publishedAt=null dan increment version; restore menyetel DRAFT, deletedAt=null, publishedAt=null. Keduanya transactional, optimistic locking dan audit `portfolio.archive`/`portfolio.restore`. Tidak ada permanent-delete endpoint atau UI baru.
- Resolver mengembalikan `{entry, canonicalSlug, redirect}` atau null; draft/review/future schedule/archived/deleted tetap null, termasuk lookup alias. HTTP 308 kini dihubungkan ke page dan OG handler melalui PRD 003 Task 4.
- Rich JSON allowlist: doc, paragraph, heading H2–H4, text, lists/listItem, blockquote, hardBreak, horizontalRule dan codeBlock; marks bold/italic/strike/code/link. Batas 12 depth, 2.000 nodes, 30.000 plain-text characters. Link hanya relative internal, anchor, HTTP(S), mailto/tel; tidak menerima script, embedded media atau arbitrary HTML/attributes.
- `saveContent` menolak edit record soft-deleted dan plain-editor save yang menghilangkan richBody existing. Existing plain case studies tetap kompatibel dan editor mengonversi plain body ke JSON ketika disimpan. Tidak ada data existing yang dikonversi/dihapus secara massal.
- `npm run db:seed:portfolio` membuat contoh dengan UUID seed tetap, rich ID/EN, label verifiedProject=false dan numeric alias 1–3. Satu transaction; konflik route menggagalkan seluruh seed. Record dengan UUID seed existing tidak di-overwrite walaupun telah diubah slug/tulisan/diarsipkan. Seeder tidak membuat user atau memanggil LLM/embedding.
- Tidak ada endpoint/API public baru. Task 3 Server Actions menghubungkan save/lifecycle dengan UI dan revalidatePath existing. Shared cache adoption masih Task 5.

## Admin Task 3

- `/dashboard/portfolio`: content:read; filter `view=active|archived` tervalidasi (default active), 100 row terbaru dengan UUID links, status/version, slug dan label ilustratif/terverifikasi. Active mengecualikan soft-deleted; tab Arsip hanya deletedAt nonnull. ARCHIVED workflow lama tanpa deletedAt masih aktif administratif, tetapi tidak public.
- `/dashboard/portfolio/new` dan `/dashboard/portfolio/[UUID]`: content:write; ID bukan UUID atau record bukan CASE_STUDY menghasilkan notFound. Deleted record menampilkan recovery panel, bukan editable form. Publisher dapat restore; nonpublisher tidak melihat kontrol lifecycle.
- Content Editor dapat membuat/edit draft/review. PUBLISHED/SCHEDULED readonly untuk nonpublisher; server tetap menolak perubahan tanpa content:publish. ADMIN/SUPER_ADMIN/MARKETING dapat publish/schedule/archive/restore sesuai grants existing. Menu bukan authorization boundary.
- Toolbar: paragraph, H2/H3/H4, bold/italic/strike, bullet/ordered lists, quote, inline/block code, horizontal rule, link, undo/redo. Underline/media/collaboration tidak aktif. Link input tervalidasi; editor tidak membuka tautan saat diklik. `immediatelyRender:false` mencegah hydration mismatch, mengikuti [Tiptap Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs).
- Ordered-list type hanya null/1/a/A/i/I dan link title maksimal 180 karakter/null diterima untuk kompatibilitas default JSON Tiptap. Arbitrary attributes, script URLs, H1 dan media tetap ditolak di server.
- Panel "Detail studi kasus" dihapus seluruhnya dari form portfolio atas refinement pengguna. Narasi hanya ditulis melalui Tiptap ID/EN; title/excerpt/SEO, kategori/tags, kredit penulis dan cover tetap tersedia. Panel detail artikel/produk tidak berubah. Public dua kolom rich renderer telah terhubung lewat PRD 004 Task 2.
- Save form portfolio mengambil metadata non-narasi sebelumnya di dalam transaction dan mengganti empat metadata dasar; hidden legacy inputs tidak digunakan dan payload palsu field yang dihapus diabaikan. Key narasi legacy tidak disimpan kembali. Record baru tetap verifiedProject=false; tidak ada kontrol baru untuk mengubah status verifikasi. Database lokal sudah di-cleanup melalui PRD 004 Task 3; deployment lain perlu menjalankan CLI setelah upgrade runtime.
- Generic `/dashboard/content/[UUID]` CASE_STUDY redirect ke portfolio editor; listing link langsung ke menu khusus. Form generic baru menawarkan ARTICLE/PRODUCT dan tautan create portfolio, bukan textarea case study yang bersaing.
- Arsip/pulihkan memerlukan konfirmasi eksplisit dan menampilkan pending/error. Restore kembali DRAFT; tidak ada permanent delete. Save remount form berdasarkan persisted version untuk reload JSON terbaru; version stale menghasilkan failure tanpa mengosongkan input.

### Server Actions

`savePortfolioAction(previousState, FormData)` memerlukan content:write sebelum parse. Fields: optional UUID id, version, slug, status, publishedAt datetime-local UTC, `id|en.title/excerpt/seoTitle/seoDescription/richBody`, category, tags, authorName, `coverOperation` (keep|replace|remove) dan `coverFile` (File saat replace). Client image path diabaikan. Kind ditetapkan server CASE_STUDY. richBody JSON wajib untuk form portfolio, maksimal 200.000 serialized characters per locale; Zod memvalidasi node/mark/limits dan publication completeness. Action mengaktifkan opsi server-only `preservePortfolioDetails` pada service CMS; opsi bukan input client dan hanya mempertahankan metadata non-narasi. Direct service save tanpa opsi menerima kontrak legacy untuk kompatibilitas tetapi mengonversinya sebelum persistence, bukan menyimpan key narasi tersebut kembali.

`portfolioLifecycleAction(previousState, FormData)` memerlukan content:publish sebelum parse; payload id UUID, version integer, operation archive|restore. Author/status/version existing dibaca dari database, bukan dipercaya dari client.

Response state: `{message, success?, id?, version?, fields?}` tanpa raw record/DB error. Invalid input/JSON, slug reserved, transition/permission/version/schedule failures ditampilkan sebagai pesan aman. Auth redirects tetap berada di luar catch mutation. Next Server Action origin/body-limit protections dipertahankan.

Setelah berhasil, revalidatePath dashboard portfolio/list/detail, generic content list, sitemap, dan kedua locale layouts. Ini invalidation pola existing, bukan implementasi tagged shared cache/PPR Task 5. Scheduled publication tetap query-time due predicate.

## Cover upload Task 5A — PRD 005 (tersedia)

[PRD 005](../products/PRD/PRD_005_portfolio-cover-upload.md) memperluas scope dengan upload cover dari perangkat. Create/edit portfolio memakai native file picker, preview, ganti/hapus referensi dan batal perubahan. Pilihan kosong mempertahankan gambar. Teks form dan File disimpan di state client agar kegagalan validasi/version tidak mereset pekerjaan. Simpan sukses memuat ulang versi persisted. Artikel/produk tetap memakai path asset existing; tidak ada upload gallery/inline Tiptap/crop/library.

Kontrak file: JPG/JPEG, PNG atau WebP statis maksimal 5 MiB. Client memeriksa MIME/size; server memeriksa signature, hasil decoder, kesesuaian MIME, maksimum 16 juta pixel, dimensi per sisi maksimal 8.000 dan satu frame. Sharp me-rotate sesuai orientation, resize inside 1.600×1.600 tanpa enlargement, re-encode WebP quality 82 dan membuang metadata. Nama original diabaikan. Server Actions limit 6 MiB menampung multipart/field lain; limit gambar tetap 5 MiB. Upload tidak memanggil AI atau layanan luar.

Penyimpanan server-only: `PORTFOLIO_UPLOAD_DIR` absolut opsional, default `storage/portfolio-covers` relatif cwd. Di luar public/build, ignored Git, direktori 0700, file 0600, tanpa symlink. File `{content UUID}/{asset UUID}.webp` exclusive-create dan fsync sebelum DB save. UUID record baru ditentukan server sebelum upload. `ContentEntry.details.image` menyimpan `/media/portfolio/{content UUID}/{asset UUID}`; tidak ada tabel/kolom/index/migration SQL baru. Opsi service cover server-only menjaga keep/remove/replace, binding pemilik, authorization/publisher/optimistic version dan transactional audit. Input path palsu/cross-record ditolak atau diabaikan. Audit CASE_STUDY before/after menyimpan image path, bukan bytes/nama asli.

File baru yang gagal terpasang dibersihkan setelah DB memastikan tidak ada referensi; commit ambigu/DB tak tersedia mempertahankan private orphan untuk menghindari menghapus cover committed. Revalidation dilakukan sesudah commit. Gambar lama yang diganti atau detached dipertahankan di disk untuk backup/recovery operasional, tetapi bukan image library dan tidak disajikan. Belum ada garbage collector; operator perlu kebijakan retention. Restore arsip mempertahankan current cover, bukan otomatis mengembalikan cover yang sebelumnya diganti/dihapus.

### Media endpoint

`GET /media/portfolio/{contentId}/{assetId}` menerima dua UUID melalui path, tanpa body/query contract. Zod invalid path menghasilkan 404. Lookup harus CASE_STUDY dengan exact current `details.image`; missing/detached asset menghasilkan 404 bahkan untuk admin. Anonymous menerima gambar hanya jika nondeleted dan PUBLISHED/due SCHEDULED. Selain itu memerlukan `content:read`; tidak berizin menghasilkan 404 tanpa login redirect/disclosure. Authorized preview tersedia untuk draft/arsip. Kesalahan DB/storage menghasilkan 503 kosong. Sukses 200 binary `image/webp`, Content-Length; semua response `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, `X-Robots-Tag: noindex`.

Public detail dan thumbnail work/home memakai current gambar yang sama, alt localized title. Layout/teal gradient fallback/CTA/logo tetap konsisten LunaBiner. Upload dirender `unoptimized` dan image optimizer hanya mengizinkan `/images/**`; `/media/**` tidak boleh melewati cache optimizer sehingga penarikan publikasi tetap diperiksa setiap request gambar. Ini tidak dapat menarik kembali salinan yang telah diunduh. OG branded contextual endpoints tetap terpisah/tidak berubah.

Task 5A tidak mengaktifkan Cache Components/PPR/ISR. Task 5B cache/PPR PRD 003 serta Task 6 final QA masih tersisa. Deployment storage/backup: [Installation](../deployment/installation.md).

## Keputusan target tersisa (belum diimplementasikan)

### Data dan boundary

Pertahankan CMS sebagai pemilik `ContentEntry(CASE_STUDY)`. Portfolio menggunakan kontrak/service domain terpisah yang memanfaatkan workflow, permission dan audit existing. Tidak membangun tabel portfolio paralel.

Migration `20261004010000_portfolio_foundation` menambah deletedAt dan PortfolioRoute; [database constraints](../database/schema.md) mencatat detail. Semua record portfolio/route memakai UUID; alias nomor hanyalah compatibility URL, bukan ID record.

Rich body ID/EN, editor Tiptap, public server renderer dan bulk cleanup lokal tersedia. Generic CMS sudah mengarahkan case study ke editor khusus. Canonical slug/DB-only public routing PRD 003 Task 4 tersedia; target tersisa cache/PPR/final QA Task 5–6.

### Public URL dan publication

Resolver memisahkan canonical slug dari alias dan hanya mengembalikan record yang layak terbit. Alias menuju slug canonical lewat redirect permanen, tanpa redirect chains. Arsip/deleted/draft tidak menjadi detail public atau target redirect. Restore menghapus penanda delete dan mengembalikan DRAFT; slug/alias tetap dicadangkan untuk record yang sama.

Public queries, metadata, schema, OG dan sitemap menggunakan publication predicate yang sama. Seeder migrasi contoh bersifat create-if-missing, bukan upsert yang memperbarui tulisan admin. Label ilustratif dipertahankan.

### Layout

Reuse shell, spacing, typography, cards, CTA dan responsive patterns LunaBiner existing yang mengadaptasi BisaDev. Detail desktop: overview kiri, rich body kanan. Mobile: urutan baca vertikal, tidak horizontal overflow. Tidak mengubah branding/logo atau menambah sistem media baru.

## Public Task 4 — slug dan database-only

`GET /{locale}/work/{slug}` (ID/EN) memakai resolver PortfolioRoute → eligible ContentEntry, lalu renderer Tiptap dan shared SEO. Canonical slug menghasilkan 200. Alias nomor/UUID/slug historis yang terdaftar menghasilkan permanentRedirect 308 langsung ke slug terkini dalam locale yang sama, tanpa chained slug history. Validasi/existence/publication diperiksa sebelum render/redirect; unknown, invalid, draft/review/future schedule/archived/deleted menghasilkan 404 tanpa mengungkap title/body atau target slug. Tidak ada endpoint mutation baru, query payload atau otorisasi public; admin RBAC tetap unchanged.

`generateMetadata` dan page memakai request-scoped React memoization yang sama; metadata, OpenGraph, Twitter, canonical, hreflang dan CreativeWork JSON-LD menggunakan slug terkini. OG `GET /{locale}/work/{slug}/opengraph-image/main` menghasilkan PNG 1200×630 no-store; alias eligible mendapat 308 ke OG canonical dan alias nonpublic 404. DB error tetap error, bukan missing/fallback data. Page error boundary menampilkan pesan ID/EN aman dan retry tanpa raw DB error.

PublishedWork dipakai oleh work dan homepage: cards memakai slug; inventory kosong menampilkan pesan empty ID/EN. Static WorkGrid dihapus, tetapi website.projects tetap merupakan sumber seed/RAG existing, bukan fallback public. Collection schema work tidak membuat static ItemList ketika DB kosong. Sitemap hanya eligible current slugs, tanpa alias/UUID, tetap tidak dibatasi jumlah cards. Static article/product behavior tidak berubah.

Related case IDs tetap UUID dalam details; publishedRelatedPortfolios memvalidasi maksimal 6 UUID, mengecualikan self/missing/nonpublic dan duplikat, mempertahankan urutan konfigurasi, lalu menampilkan slug links serta label ilustratif. Metadata relasi existing tetap dipertahankan saat save; tidak menambahkan panel admin baru. RAG/knowledge indexing belum diubah; existing numeric source links terpetakan menggunakan compatibility redirect. CMS→RAG masih task Phase 2 terpisah.

Saat Task 4 ini page tetap dynamic SSR/request cache, bukan PPR/ISR/shared cache. Pemeriksaan sebelum streaming diuji menghasilkan HTTP 308/404 untuk Twitterbot, Googlebot dan browser UA production. Task 5 perlu menjaga status/canonical/publication invariants saat mengubah rendering. Tidak ada schema/database mutation pada Task 4.

## Audit PPR

Panduan lokal Next terpasang: `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md` dan `incremental-static-regeneration-cache-components.md`.

Temuan dokumentasi dan kode:

1. PPR Next 16 menggunakan `cacheComponents`, bukan `experimental_ppr` lama. Route configs `dynamic`, `revalidate`, `fetchCache` tidak kompatibel ketika flag diaktifkan.
2. Flag memengaruhi aplikasi, bukan hanya work. Root `headers()` harus diselesaikan tanpa menghilangkan HTML language ID/EN atau men-cache request/session antar user.
3. I/O uncached perlu boundary Suspense; data public dapat menggunakan `use cache`/cacheLife/cacheTag. Instant validation opt-out bukan solusi untuk seluruh prerender errors.
4. Panduan versi terpasang membahas `partialPrefetching` untuk ISR/App Shell dynamic params. Empty database, unknown/new slug, metadata dan notFound harus diuji, tidak boleh dibuat fake published param untuk meloloskan build.
5. Cached data dan mutation invalidation harus konsisten di cards/detail/SEO/sitemap. Shared cache tidak memuat authorization/admin/private data. Scheduled publishing membutuhkan expiry yang tidak menunda visibilitas tanpa batas.

Kesimpulan: versi framework menyediakan jalur PPR, tetapi aplikasi saat ini belum kompatibel tanpa penyesuaian. Belum ada proof build/runtime PPR; audit ini bukan hasil eksperimen bahwa PPR gagal atau berhasil.

Task 5 akan membuktikan feasibility melalui perubahan minimum yang diperlukan, build production dan inspeksi response/rendering, termasuk regression private routes, locale dan OG handlers. Jika perlu perluasan material, laporkan sebelum perubahan. Fallback yang telah disetujui adalah streaming SSR + public data cache; tetap bukan PPR dan tidak boleh dilaporkan sebagai PPR. Intro harus tidak menunggu query list/schema yang tidak perlu.

## Rencana verifikasi

Task 2: migration/seed ulang, UUID, uniqueness, alias conflicts, soft-delete/restore dan version/RBAC tests.
Task 3: editor ID/EN, validation/link safety, permissions, publication/archive/restore UI.
Task 4: canonical slug/redirect/404, DB-only list/detail, SEO/schema/OG/sitemap serta homepage/related links.
Task 5: production rendering/cache invalidation, new slug/empty DB, publication timing, locale/private regression.
Task 6: end-to-end lifecycle, desktop/mobile, typecheck/build dan dokumentasi aktual.

## Tracking

PRD 003 Task 1 dokumentasi, Task 2 fondasi dan Task 3 admin editor tersedia. Task 4 public slug/redirect/DB-only tersedia (rich renderer melalui PRD 004). Task 5–6 masih tersisa. [Laporan Task 1](../reports/2026/10/04/portfolio_task1.md), [Laporan Task 2](../reports/2026/10/04/portfolio_task2.md), [Laporan Task 3](../reports/2026/10/04/portfolio_task3.md), [Laporan Task 4](../reports/2026/10/04/portfolio_task4.md). PRD 004 Task 1–3 selesai dan cleanup lokal sudah diterapkan. [Laporan Tiptap Task 2](../reports/2026/10/04/portfolio_tiptap_task2.md), [Laporan Tiptap Task 3](../reports/2026/10/04/portfolio_tiptap_task3.md).
