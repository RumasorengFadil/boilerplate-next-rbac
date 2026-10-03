# Implementation Report — Public SEO, Task 1

**Tanggal:** 2026-10-03

**Classification:** MEDIUM

**Status:** PARTIALLY COMPLETED

## Rencana dan Tracking

- Current Task: Task 1 — Helper SEO/schema, sumber konten bersama dan renderer OG. Selesai.
- Progress: Task 1/3 selesai. Helper belum dihubungkan ke halaman, jadi SEO live belum berubah.
- Next Task: Task 2 — Integrasi seluruh halaman publik dan route OG; menunggu konfirmasi pengguna. Task 3 — Verifikasi HTML/crawler, sitemap dan dokumentasi final.

## Penyebab dan Perubahan

- Penyebab: Root metadata masih generik; belum ada fondasi konsisten untuk metadata/page schema dan OG per konteks.
- Perubahan: Registry bilingual delapan halaman tetap; Zod document/path contracts; Metadata → OpenGraph → Twitter → Canonical → Schema.org builders. Absolute branded title, full OG/Twitter, locale dan ID/EN/x-default alternates menghindari duplikasi default/title template.
- Perubahan: Resolver RSC cached memakai status public CMS dan field SEO existing, dengan fallback static yang sesuai route existing. Author/tanggal hanya dari data nyata. Case study tidak terverifikasi ditandai contoh ilustratif; produk konsep tidak diberi schema penawaran aktif.
- Perubahan: JSON-LD serialization aman dan renderer PNG nyata 1200×630 menggunakan logo lokal; desain mengikuti warna teal/dark/orange LunaBiner dan konten berbeda per konteks.

## File Change

- Created: `src/features/website/seo/contracts.ts`, `registry.ts`, `metadata.ts`, `schema.ts`, `json-ld.tsx`, `content.ts`, `og-image.tsx`; `tests/seo.test.mjs`; `docs/features/seo.md`; laporan ini.
- Modified: `tests/server-loader.mjs` (resolve Next OG asli dalam Node ESM), `docs/README.md`, `docs/architecture/overview.md`.
- Deleted: None.

## Database Change

None. Menggunakan `ContentEntry` dan field translations/details/date existing; tidak ada tabel, kolom, index, constraint, migration atau ID numerik baru. Fixture UUID hanya dibuat/di-cleanup pada PostgreSQL tes sementara port 55439, bukan database pengguna.

## Architecture Change

Fondasi SEO ditempatkan dalam domain website, bukan infrastruktur generic. Satu validated SEO document menjadi sumber metadata dan JSON-LD; detail resolver server-only memisahkan query CMS dari builder murni. Renderer OG Node membaca asset logo lokal. Belum ada perubahan route, API, autentikasi, izin, sitemap, robots atau halaman.

## Verification

- `npm run typecheck`, `npm run lint`, `npm run build`: lulus.
- 7 tes SEO: lulus (unique bilingual metadata/OG URLs, canonical safety, schema types/reference, XSS serialization, CMS published filtering/fallback, detail route compatibility, real PNG dimensions/content).
- Suite regresi penuh: 44 tes lulus pada database terisolasi.
- Visual QA: PNG home dan consultation diperiksa; logo/title/description terbaca, tidak terpotong dan layout konsisten dengan identitas existing. Asset sementara: `/private/tmp/lunabiner-seo-og-6tQTsX/` dan `/private/tmp/lunabiner-seo-og-Q2cSns/`, tidak di-commit.
- Masalah test-only `next/og` extensionless diselesaikan di loader dengan modul Next asli, tanpa mock renderer.
- Belum ada HTTP/crawler/validator produksi karena integrasi route belum dilakukan. Tidak ada panggilan LLM atau perubahan credential.

## Remaining Tasks

- Task 2 — Hubungkan helper dengan metadata, JSON-LD dan OG setiap halaman public/detail ID/EN. Gunakan resolver yang sama untuk metadata dan konten; null menghasilkan 404. Review semantik schema dan claims sesuai konten yang benar-benar tampil.
- Task 3 — Sinkronisasi sitemap, uji rendered metadata/canonical/hreflang sebagai crawler, OG image endpoint dan JSON-LD, dokumentasi/report final.

SEO friendly di sini berarti metadata deskriptif per halaman, canonical konsisten, bahasa sesuai konten dan schema tanpa klaim palsu; bukan janji ranking atau rich results. Keywords bukan Google ranking factor sesuai [Google Search Central](https://developers.google.com/search/blog/2009/09/google-does-not-use-keywords-meta-tag). Tidak melanjutkan Task 2 tanpa konfirmasi sesuai AGENTS.md.
