# Portfolio — kondisi aktual dan keputusan target

Tanggal audit: 2026-10-04. Requirement: [PRD 003](../products/PRD/PRD_003_portfolio-cms.md).
Dokumen ini membedakan implementasi saat ini dengan keputusan target. Task 2 menyediakan fondasi database/service; UI dan public routing masih menunggu Task 3–4.

## Kondisi aktual

- `ContentEntry` sudah memakai primary key UUID, unique `(kind, slug)`, index `(kind, status, publishedAt)`, JSON translations/details dan optimistic version.
- Generic CMS mengelola `CASE_STUDY` melalui permission content. Body editor masih plain text; Tiptap belum terpasang. Kontrak sekarang menerima `richBody` JSON opsional pada translations ID/EN khusus CASE_STUDY dan menghasilkan plain `body` dari JSON tersebut.
- Public work menggunakan published CMS entries dengan fallback contoh statis. Detail `[id]` menerima nomor contoh/UUID, belum public slug-only canonical.
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
- `saveContent` menolak edit record soft-deleted dan plain-editor save yang menghilangkan richBody existing. Existing plain case studies tetap kompatibel; editor khusus akan tersedia Task 3. Tidak ada data existing yang dikonversi/dihapus secara massal.
- `npm run db:seed:portfolio` membuat contoh dengan UUID seed tetap, rich ID/EN, label verifiedProject=false dan numeric alias 1–3. Satu transaction; konflik route menggagalkan seluruh seed. Record dengan UUID seed existing tidak di-overwrite walaupun telah diubah slug/tulisan/diarsipkan. Seeder tidak membuat user atau memanggil LLM/embedding.
- Belum ada endpoint/API public baru. Cache dan mutation-to-public invalidation untuk lifecycle baru belum diaktifkan; service belum terhubung UI/action (Task 3/5).

## Keputusan target tersisa (belum diimplementasikan)

### Data dan boundary

Pertahankan CMS sebagai pemilik `ContentEntry(CASE_STUDY)`. Portfolio menggunakan kontrak/service domain terpisah yang memanfaatkan workflow, permission dan audit existing. Tidak membangun tabel portfolio paralel.

Migration `20261004010000_portfolio_foundation` menambah deletedAt dan PortfolioRoute; [database constraints](../database/schema.md) mencatat detail. Semua record portfolio/route memakai UUID; alias nomor hanyalah compatibility URL, bukan ID record.

Rich body ID/EN sudah dapat menyimpan Tiptap JSON tervalidasi. Editor Tiptap dan public server renderer masih target Task 3–4, bukan fitur yang telah tersedia. Generic CMS perlu mengarahkan case study ke editor khusus; safety guard backend telah diterapkan.

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

Task 1 dokumentasi dan Task 2 fondasi selesai. Task 3–6 belum diimplementasikan. [Laporan Task 1](../reports/2026/10/04/portfolio_task1.md), [Laporan Task 2](../reports/2026/10/04/portfolio_task2.md).
