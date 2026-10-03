# Implementation Report — Public SEO Task 2

**Tanggal:** 2026-10-03

**Classification:** MEDIUM

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: Task 2 — integrasi metadata, schema JSON-LD dan OG image ke seluruh halaman public ID/EN.
- Progress: Task 1 dan Task 2 selesai (2/3 task). Keseluruhan pekerjaan SEO masih PARTIALLY COMPLETED.
- Next Task: Task 3 — sinkronisasi sitemap, audit crawler menyeluruh dan final SEO QA. Menunggu konfirmasi pengguna.

## Penyebab dan Perubahan

- Penyebab: Helper metadata/schema Task 1 belum dipakai route live; sebelumnya halaman mewarisi metadata generik root.
- Perubahan: Delapan keluarga halaman public (home, solutions, work, products, insights, about, contact, consultation) menggunakan generateMetadata dan JsonLd dengan bundle yang sama. Title absolute mencegah brand berulang; OpenGraph, Twitter, canonical, hreflang, robots, category dan keywords lengkap sesuai konteks ID/EN.
- Perubahan: Detail artikel/studi kasus berbagi resolver published antara metadata, schema dan konten. CMS menggunakan seoTitle/seoDescription dan tanggal/author nyata; tanpa category/tags, keywords tetap memiliki fallback sesuai jenis konten. UUID konten CMS tetap dipertahankan.
- Perubahan: Collection schema mengikuti published CMS yang tampil, bukan fallback statis yang tersembunyi. Services menggunakan Service; insights memiliki Blog/Article; portfolio menggunakan CreativeWork; konsep produk tidak menjadi penawaran/produk aktif fiktif.
- Perubahan: Organization/WebSite hanya dirender sekali oleh public layout. Main content memiliki lang sesuai locale; belum ada perubahan arsitektur root HTML language.
- Perubahan: Sepuluh keluarga endpoint OG menghasilkan PNG 1200×630 dari logo lokal LunaBiner, warna teal/dark/orange dan copy kontekstual, tanpa layanan gambar eksternal/LLM. Twitter memakai gambar yang sama; tidak mengarang akun Twitter resmi.
- Perubahan: Label studi kasus statis menjadi contoh ilustratif agar UI konsisten dengan schema. Grid, spacing, typography, CTA dan responsive classes existing tidak diubah.
- Perubahan: Next 16.3.8 memberi suffix pada file-convention OG dalam route group dan memanggil image metadata saat build. Digunakan explicit Node route handlers dengan URL stabil /opengraph-image/main, force-dynamic dan no-store; image variant main bukan ID database. Build dan endpoint kemudian berhasil diverifikasi.

## File Change

- Created: src/features/website/seo/routes.ts; sepuluh opengraph-image/main/route.ts di src/app/(public)/[locale]/ untuk setiap keluarga halaman termasuk detail; tests/seo-http.mjs; laporan ini.
- Modified: public locale layout dan sepuluh page.tsx; src/features/cms/service.ts (request-scoped React cache); src/features/website/components.tsx (label ilustratif); src/features/website/seo/metadata.ts dan content.ts; tests/seo.test.mjs dan server-loader.mjs; docs/features/seo.md, docs/architecture/overview.md, docs/deployment/installation.md, docs/README.md.
- Deleted: None pada file yang sudah dilacak sebelum task. File-convention OG sementara diganti sebelum commit; tidak ada data pengguna yang dihapus.

## Database Change

None. Tidak ada table/column/index/constraint/migration baru. Tes memakai PostgreSQL sementara role lunabiner_test port 55439; hanya fixture UUID dibuat/dihapus. Database lunabiner pengguna tidak dipakai untuk mutasi tes.

## Architecture Change

- Request-scoped cache menyatukan snapshot published CMS untuk UI/metadata/schema tanpa cache lintas request.
- Endpoint public read-only GET /{locale}{pagePath}/opengraph-image/main mengembalikan image/png; validasi Zod locale/slug/identifier, 404 untuk input/detail tidak eligible, error server tetap propagasi. Tidak ada payload, authentication atau write.
- Runtime OG membutuhkan Node dan public/images/lunabiner-logo.png; build trace standalone sudah menyertakan logo. Instruksi deploy public/.next/static diperbarui.
- MetadataBase/global defaults tetap di root, metadata halaman di generateMetadata, Organization/WebSite di public layout, graph contextual di page. Tidak ada perubahan RBAC, assistant, auth, API existing, sitemap atau robots.

## Verification

- npm run typecheck: lulus.
- npm run lint: lulus.
- npm run build: lulus, mencakup seluruh explicit endpoint OG.
- node --test tests/*.test.mjs: 46/46 lulus dengan database test terisolasi; termasuk 9 tes SEO.
- node tests/seo-http.mjs: lulus pada server production sementara. 24 halaman ID/EN (16 fixed-page variants, 4 CMS detail variants, 4 static detail variants) diverifikasi untuk field metadata lengkap, canonical, schema, title tanpa duplikasi brand serta PNG aktual 1200×630.
- Delapan halaman fixed masing-masing bahasa memiliki title/description/gambar berbeda; schema Organization/WebSite muncul satu kali. Draft/missing detail dan OG-nya menghasilkan 404; invalid locale OG juga 404.
- PNG home ditinjau secara visual: logo, headline, copy dan warna konsisten dengan LunaBiner. Layout halaman tidak direstrukturisasi; belum ada audit visual browser desktop/mobile menyeluruh baru pada task ini.
- Standalone trace menyertakan logo lokal; belum dilakukan deployment external/Google Search Console/Rich Results live. Tidak ada panggilan LLM berbayar atau push Git.

## Remaining Tasks

- Task 3 — sinkronisasi sitemap dengan origin/canonical dan published CMS; audit crawler/hreflang/schema/robots/OG menyeluruh serta final report.
- Audit root HTML lang untuk halaman EN (saat ini root tetap id, main dan schema/OG sudah en). Perubahan root-layout/proxy tidak dilakukan diam-diam pada Task 2.
- Production origin dan akun sosial resmi tetap perlu dikonfirmasi sebelum deployment; tidak ada jaminan ranking/rich results dari metadata semata.
