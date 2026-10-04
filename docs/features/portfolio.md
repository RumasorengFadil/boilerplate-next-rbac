# Portfolio — kondisi aktual dan keputusan target

Tanggal audit: 2026-10-04. Requirement: [PRD 003](../products/PRD/PRD_003_portfolio-cms.md).
Dokumen ini membedakan implementasi saat ini dengan keputusan target; Task 1 tidak mengubah kode/database.

## Kondisi aktual

- `ContentEntry` sudah memakai primary key UUID, unique `(kind, slug)`, index `(kind, status, publishedAt)`, JSON translations/details dan optimistic version.
- Generic CMS mengelola `CASE_STUDY` melalui permission content. Body editor masih plain text; Tiptap belum terpasang.
- Public work menggunakan published CMS entries dengan fallback contoh statis. Detail `[id]` menerima nomor contoh/UUID, belum public slug-only canonical.
- Workflow sudah memiliki ARCHIVED, tetapi belum memiliki penanda soft delete tersendiri.
- Cache Components belum diaktifkan. Root layout membaca request `headers()` untuk bahasa HTML; work dan sejumlah public/OG/sitemap routes memakai `force-dynamic`.
- React cache yang ada menduplikasi query per render, bukan cache data lintas request.

## Keputusan target (belum diimplementasikan)

### Data dan boundary

Pertahankan CMS sebagai pemilik `ContentEntry(CASE_STUDY)`. Portfolio menggunakan kontrak/service domain terpisah yang memanfaatkan workflow, permission dan audit existing. Tidak membangun tabel portfolio paralel.

Rancangan perubahan database Task 2: penanda soft delete nullable pada content, lookup alias URL lama untuk UUID/nomor/slug sebelumnya, constraint unik namespace alias dan pengecekan konflik terhadap slug aktif. Detail nama tabel, index, FK dan migration akan dipresentasikan sebelum Task 2. Semua record baru memakai UUID; alias nomor hanyalah compatibility URL, bukan ID record.

Rich body ID/EN menyimpan Tiptap JSON tervalidasi. Plain text existing perlu migrasi/compatibility sehingga tidak hilang. Public menggunakan renderer server node/mark allowlist; tidak memakai arbitrary HTML dari input editor. Generic CMS harus mengenali case-study editor untuk mencegah overwrite rich body.

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

Task 1 selesai setelah laporan dan commit dokumentasi; Task 2–6 belum diimplementasikan dalam pekerjaan ini. [Laporan Task 1](../reports/2026/10/04/portfolio_task1.md).
