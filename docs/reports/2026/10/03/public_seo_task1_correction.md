# Implementation Report — Koreksi Public SEO Task 1

**Tanggal:** 2026-10-03

**Classification:** SMALL

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: Koreksi fondasi Task 1 berdasarkan contoh metadata + schema pengguna.
- Progress: Koreksi selesai. Task 1 tidak hanya menghasilkan title/description/keywords; facade sekarang mengekspos seluruh metadata bersama schema dalam satu pasangan.
- Next Task: Task 2 integrasi route public dan OG, kemudian Task 3 sitemap/verifikasi crawler; tetap menunggu konfirmasi pengguna. Keseluruhan pekerjaan SEO masih PARTIALLY COMPLETED.

## Penyebab dan Perubahan

- Penyebab: Registry editorial tampak seperti metadata final. Builder sebelumnya sebenarnya sudah memiliki OpenGraph, Twitter, canonical dan robots, tetapi metadata.category belum diisi dan belum ada facade `{ metadata, schema }`.
- Perubahan: Tambahkan `index.ts` dengan `getPageSeo` dan `buildSeo` yang mengembalikan pasangan metadata/schema lengkap. Rename helper sumber menjadi `getPageSeoDocument` untuk membedakan kontraknya; builder metadata menambahkan category.
- Perubahan: Insights tetap CollectionPage dan memiliki main entity Blog dengan @id, name, description, url dan publisher LunaBiner sesuai referensi. Referensi Blog tidak hilang saat ItemList disertakan. Schema menggunakan @graph valid untuk page/image/content entities, bukan menyalin identitas BisaDev.
- Perubahan: Tes mengecek semua field referensi dan konsistensi schema/metadata bagi delapan halaman dalam dua bahasa. Twitter.site sengaja tidak dibuat karena akun resmi LunaBiner belum diberikan; tidak memakai @bisadev atau mengarang @lunabiner.

## File Change

- Created: `src/features/website/seo/index.ts`, laporan ini.
- Modified: `src/features/website/seo/metadata.ts`, `contracts.ts`, `registry.ts`, `schema.ts`; `tests/seo.test.mjs`; `docs/features/seo.md`, `docs/README.md`, `docs/reports/2026/10/03/public_seo_task1.md`.
- Deleted: None.

## Database Change

None. Tes memakai database PostgreSQL sementara port 55439; hanya fixture UUID test yang dibuat/di-cleanup, bukan database pengguna.

## Architecture Change

Facade kecil di domain website menyatukan metadata/schema yang sebelumnya memakai dua builder. Server resolver, konfigurasi origin, rendering halaman, API, RBAC dan migration tetap. Tidak ada integrasi route lebih awal.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build`: lulus.
- Delapan tes SEO termasuk facade semua field metadata + schema Blog: lulus.
- Suite regresi penuh: 45 tes lulus dengan database terisolasi dan renderer Next OG asli.
- Tidak ada pengujian crawler/HTML live atau perubahan SEO halaman live karena Task 2 belum diimplementasikan.

## Reference

[Schema.org Blog](https://schema.org/Blog) dan dokumentasi Next lokal untuk Metadata API/JSON-LD. Robots object `{ index: true, follow: true }` menghasilkan `index, follow`; title absolute menghindari brand ganda pada template root. Struktur @graph mempertahankan schema type yang sesuai masing-masing halaman, bukan Blog untuk semua halaman.
