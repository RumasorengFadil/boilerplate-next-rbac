# Portfolio — kondisi aktual dan keputusan target

Tanggal audit: 2026-10-04. Requirement: [PRD 003](../products/PRD/PRD_003_portfolio-cms.md).
Dokumen ini membedakan implementasi saat ini dengan keputusan target. PRD 003 Task 2 menyediakan fondasi database/service dan Task 3 admin editor; PRD 004 Task 2 menghubungkan rich renderer. Canonical slug routing dan DB-only fallback removal PRD 003 masih menunggu Task 4.

## Refinement Tiptap single source — PRD 004

[PRD 004](../products/PRD/PRD_004_portfolio-tiptap-single-source.md) merekam perubahan requirement setelah PRD 003: narasi hanya Tiptap, dan key legacy yang sudah tidak dipakai dibuang dari database setelah konversi. Implementasi refinement terbagi menjadi Task 1 konverter/preview, Task 2 runtime integration dan Task 3 backup/apply/QA; bukan penomoran ulang task PRD 003.

Task 1 tersedia: `convertLegacyPortfolioContent` memvalidasi details/translations existing, mempertahankan rich nodes/marks, mengonversi plain body jika perlu, lalu menambahkan isi legacy yang belum tercakup sebagai H2/paragraf atau bullet list ID/EN. Pembandingan teks memakai normalisasi whitespace/NFC dan batas whitespace, bukan perbandingan heading saja. Existing teks yang telah direvisi admin dan berbeda dengan legacy akan tetap dipertahankan; nilai legacy berbeda ditambahkan untuk mencegah kehilangan informasi dan dapat dirapikan saat review editorial. Tidak memakai LLM untuk menebak kesamaan makna.

Output konverter menghapus hanya key industry/challenge/approach/solution/impact/before/after/architecture/capabilities/technology dan menurunkan plain body dari richBody. Field lain, SEO, format tulisan dan data sumber tidak diubah. Kedua bahasa harus lolos allowlist/batas rich content sebelum output siap. Tidak ada truncation otomatis.

`npm run db:preview:portfolio-content` hanya menghitung total, record dengan legacy keys, perubahan yang dapat dikonversi dan record invalid. Transaksi PostgreSQL READ ONLY/RepeatableRead; tidak ada mode apply, dump konten, kredensial atau external provider calls. Meliputi draft/arsip/deleted CASE_STUDY juga. Kegagalan koneksi/validasi tidak mengubah data.

Task 2 tersedia: `presentContent` menormalkan CASE_STUDY melalui konverter tanpa writes, sehingga editor ID/EN dan public memakai dokumen yang sama sebelum bulk migration. Save CASE_STUDY dan seed baru menyimpan richBody/derived body serta details tanpa sepuluh key legacy. Existing record hanya berubah saat operator menyimpan; bulk cleanup semua status masih Task 3. Field legacy yang sengaja dihapus admin dari editor tidak ditambahkan ulang dari previous details. Plain-editor write terhadap existing portfolio ditolak agar tidak menghilangkan default rich yang telah dikonversi. Generic ARTICLE/PRODUCT tidak menggunakan adapter ini.

`RichTextContent` merender JSON tervalidasi sebagai React server HTML dengan heading H2–H4, paragraf, lists, quotes, code, links, breaks dan rule; text di-escape, link allowlist diperiksa, tanpa dangerouslySetInnerHTML atau bundel Tiptap client pada public. CASE_STUDY memakai overview kiri (category/tags/credit dan verified client jika tersedia) dan rich content kanan; mobile vertikal. Sepuluh field legacy tidak dirender sebagai blok tambahan. Cover, features, gallery, relasi/CTA dan verification metadata existing tetap digunakan, bukan dihapus sebagai data tidak terpakai.

Kartu CMS portfolio menampilkan category, bukan industry legacy. SEO keywords memakai category/tags dan label domain, bukan capabilities legacy. UUID public route tetap existing; numeric alias yang sudah terpetakan ke PortfolioRoute kini membaca eligible DB record yang sama dan metadata canonical UUID. Record nonpublic terpetakan menghasilkan null/404, bukan fallback. Sitemap mengecualikan numeric alias terpetakan dan hanya menyertakan canonical UUID eligible pemiliknya. Numeric URL yang belum terpetakan masih memakai fallback statis sampai PRD 003 Task 4; belum ada permanent redirect/slug adoption. Seed tetap create-if-missing dan tidak overwrite existing edits, dengan category/tags dan narasi industry/capabilities dalam richBody.

**Belum diimplementasikan:** bulk migration dengan backup dan cleanup key legacy pada seluruh database nyata (PRD 004 Task 3). Key JSON bukan kolom SQL; ContentEntry.details tetap digunakan metadata dan ARTICLE/PRODUCT. UUID/routes/status/publishedAt tetap dipertahankan.

## Kondisi aktual

- `ContentEntry` sudah memakai primary key UUID, unique `(kind, slug)`, index `(kind, status, publishedAt)`, JSON translations/details dan optimistic version.
- Menu Portfolio dan `/dashboard/portfolio` mengelola CASE_STUDY dengan Tiptap 3.31.4 ID/EN. Generic CMS mengarahkan case study ke editor khusus. Kontrak menerima `richBody` JSON per locale dan menghasilkan plain `body` dari JSON tersebut; artikel/produk tetap plain editor.
- Public work menggunakan published CMS entries dengan fallback contoh statis. Detail `[id]` menerima nomor contoh/UUID; nomor terpetakan membaca DB rich content, belum public slug-only canonical.
- `ContentEntry.deletedAt` membedakan soft delete dari status workflow ARCHIVED. Shared public predicate mengecualikan deleted records.
- `PortfolioRoute` mencadangkan slug/UUID/alias historis dalam satu namespace. Trigger database melindungi konflik slug, termasuk write melalui generic CMS. Tiga seed ilustratif telah dimasukkan ke database lokal.
- Cache Components belum diaktifkan. Root layout membaca request `headers()` untuk bahasa HTML; work dan sejumlah public/OG/sitemap routes memakai `force-dynamic`.
- React cache yang ada menduplikasi query per render, bukan cache data lintas request.

## Fondasi Task 2 yang telah diimplementasikan

- `src/features/portfolio/schema.ts`: descriptive slug (bukan nomor/UUID), CASE_STUDY contract, lifecycle input UUID/version/operation.
- `src/features/portfolio/service.ts`: `savePortfolio` (content:write + publisher guard CMS), `changePortfolioLifecycle` (content:publish), dan `resolvePublishedPortfolio` (server-only public lookup).
- Archive menyetel deletedAt, ARCHIVED, publishedAt=null dan increment version; restore menyetel DRAFT, deletedAt=null, publishedAt=null. Keduanya transactional, optimistic locking dan audit `portfolio.archive`/`portfolio.restore`. Tidak ada permanent-delete endpoint atau UI baru.
- Resolver mengembalikan `{entry, canonicalSlug, redirect}` atau null; draft/review/future schedule/archived/deleted tetap null, termasuk lookup alias. HTTP redirect belum dihubungkan ke halaman public.
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
- Save form portfolio mengambil metadata non-narasi sebelumnya di dalam transaction dan mengganti empat metadata dasar; hidden legacy inputs tidak digunakan dan payload palsu field yang dihapus diabaikan. Key narasi legacy tidak disimpan kembali. Record baru tetap verifiedProject=false; tidak ada kontrol baru untuk mengubah status verifikasi. Legacy dalam database yang belum disimpan tetap ada sampai bulk cleanup Task 3, tetapi tidak lagi dirender secara terpisah.
- Generic `/dashboard/content/[UUID]` CASE_STUDY redirect ke portfolio editor; listing link langsung ke menu khusus. Form generic baru menawarkan ARTICLE/PRODUCT dan tautan create portfolio, bukan textarea case study yang bersaing.
- Arsip/pulihkan memerlukan konfirmasi eksplisit dan menampilkan pending/error. Restore kembali DRAFT; tidak ada permanent delete. Save remount form berdasarkan persisted version untuk reload JSON terbaru; version stale menghasilkan failure tanpa mengosongkan input.

### Server Actions

`savePortfolioAction(previousState, FormData)` memerlukan content:write sebelum parse. Fields: optional UUID id, version, slug, status, publishedAt datetime-local UTC, `id|en.title/excerpt/seoTitle/seoDescription/richBody`, category, tags, authorName dan image. Kind ditetapkan server CASE_STUDY. richBody JSON wajib untuk form portfolio, maksimal 200.000 serialized characters per locale; Zod memvalidasi node/mark/limits dan publication completeness. Action mengaktifkan opsi server-only `preservePortfolioDetails` pada service CMS; opsi bukan input client dan hanya mempertahankan metadata non-narasi. Direct service save tanpa opsi menerima kontrak legacy untuk kompatibilitas tetapi mengonversinya sebelum persistence, bukan menyimpan key narasi tersebut kembali.

`portfolioLifecycleAction(previousState, FormData)` memerlukan content:publish sebelum parse; payload id UUID, version integer, operation archive|restore. Author/status/version existing dibaca dari database, bukan dipercaya dari client.

Response state: `{message, success?, id?, version?, fields?}` tanpa raw record/DB error. Invalid input/JSON, slug reserved, transition/permission/version/schedule failures ditampilkan sebagai pesan aman. Auth redirects tetap berada di luar catch mutation. Next Server Action origin/body-limit protections dipertahankan.

Setelah berhasil, revalidatePath dashboard portfolio/list/detail, generic content list, sitemap, dan kedua locale layouts. Ini invalidation pola existing, bukan implementasi tagged shared cache/PPR Task 5. Scheduled publication tetap query-time due predicate.

## Keputusan target tersisa (belum diimplementasikan)

### Data dan boundary

Pertahankan CMS sebagai pemilik `ContentEntry(CASE_STUDY)`. Portfolio menggunakan kontrak/service domain terpisah yang memanfaatkan workflow, permission dan audit existing. Tidak membangun tabel portfolio paralel.

Migration `20261004010000_portfolio_foundation` menambah deletedAt dan PortfolioRoute; [database constraints](../database/schema.md) mencatat detail. Semua record portfolio/route memakai UUID; alias nomor hanyalah compatibility URL, bukan ID record.

Rich body ID/EN, editor Tiptap dan public server renderer tersedia. Generic CMS sudah mengarahkan case study ke editor khusus. Target tersisa mencakup bulk cleanup PRD 004 Task 3 dan canonical slug/DB-only public routing PRD 003 Task 4.

### Public URL dan publication

Resolver memisahkan canonical slug dari alias dan hanya mengembalikan record yang layak terbit. Alias menuju slug canonical lewat redirect permanen, tanpa redirect chains. Arsip/deleted/draft tidak menjadi detail public atau target redirect. Restore menghapus penanda delete dan mengembalikan DRAFT; slug/alias tetap dicadangkan untuk record yang sama.

Public queries, metadata, schema, OG dan sitemap menggunakan publication predicate yang sama. Seeder migrasi contoh bersifat create-if-missing, bukan upsert yang memperbarui tulisan admin. Label ilustratif dipertahankan.

### Layout

Reuse shell, spacing, typography, cards, CTA dan responsive patterns LunaBiner existing yang mengadaptasi BisaDev. Detail desktop: overview kiri, rich body kanan. Mobile: urutan baca vertikal, tidak horizontal overflow. Tidak mengubah branding/logo atau menambah sistem media baru.

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

PRD 003 Task 1 dokumentasi, Task 2 fondasi dan Task 3 admin editor tersedia. Rich renderer subset Task 4 tersedia lewat PRD 004 Task 2; slug/redirect/DB-only fallback removal dan Task 5–6 masih tersisa. [Laporan Task 1](../reports/2026/10/04/portfolio_task1.md), [Laporan Task 2](../reports/2026/10/04/portfolio_task2.md), [Laporan Task 3](../reports/2026/10/04/portfolio_task3.md). PRD 004 Task 1–2 selesai; Task 3 bulk cleanup menunggu konfirmasi. [Laporan Tiptap Task 2](../reports/2026/10/04/portfolio_tiptap_task2.md).
