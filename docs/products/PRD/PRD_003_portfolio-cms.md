# PRD 003 — Portfolio CMS LunaBiner

Tanggal: 2026-10-04
Status requirement: disetujui pengguna melalui konfirmasi “oke kunci”.
Status implementasi: Task 1 dokumentasi; fitur belum diimplementasikan.
Sumber: briefing pengguna mengenai public work, admin portfolio, UUID, slug, Tiptap, PPR dan soft delete. Memperinci bagian Case Study Management PRD 002; tidak mengaktifkan seluruh scope Phase 2.

## Tujuan

Admin dapat mengelola portfolio tanpa perubahan kode. Halaman work dan detail membaca database, tetap konsisten dengan layout referensi BisaDev yang telah diadaptasi, logo dan identitas LunaBiner, serta desain modern, clean, professional dan B2B.

## Scope

1. Menu Portfolio admin: daftar, buat, edit, workflow publikasi, arsip dan pulihkan.
2. Identifier record UUID; URL public memakai slug yang SEO-friendly, bukan nomor atau UUID.
3. Reuse CMS `ContentEntry` dengan kind `CASE_STUDY`, bukan duplikasi tabel portfolio tanpa kebutuhan.
4. Structured overview: title, slug, excerpt, client, industry, technology, capabilities, features, gallery, related services/case studies dan SEO, menggunakan kemampuan CMS yang relevan.
5. Detail mempertahankan dua kolom: OVERVIEW kiri, rich content kanan. Konten kanan diedit dengan Tiptap untuk ID/EN.
6. Rich content berupa JSON tervalidasi dengan node, mark dan link allowlist; renderer public server-side yang aman. Editor tidak dimuat di halaman public.
7. Soft delete terpisah dari workflow publikasi; record tidak dihapus permanen. Pulihkan sebagai DRAFT, bukan otomatis terbit kembali.
8. Migrasikan tiga contoh ilustratif saat ini melalui seeder idempotent. Contoh tetap dilabeli ilustratif, tidak menjadi klaim proyek/klien nyata. Seeder ulang tidak menimpa edit admin.
9. Public list/detail mengambil record layak terbit dari DB saja. Tidak ada fallback portfolio hardcoded ketika database kosong. Empty/error state harus jelas.
10. URL nomor/UUID lama yang terpetakan dan slug sebelumnya redirect permanen ke slug canonical. Draft/arsip/deleted tidak dibocorkan melalui redirect atau public lookup.
11. Metadata, OpenGraph, Twitter, canonical, schema, sitemap, homepage cards dan link terkait menggunakan sumber portfolio yang sama dan URL slug. Sitemap hanya memuat URL canonical record layak terbit.
12. Desktop/mobile responsive; tidak mengubah arah visual atau fitur di luar scope.

## Rendering dan performance

- Utamakan Partial Prerendering yang benar-benar didukung Next.js terpasang, bukan sekadar label ISR/PPR pada streaming SSR.
- Shell yang independen dari DB (navigasi, intro/list heading dan struktur halaman) dapat tampil lebih dulu. Isi portfolio bergantung DB; tidak boleh diganti informasi fiktif demi shell.
- Gunakan cache data public dan invalidation setelah mutasi. Authorization/session/admin data tidak masuk shared public cache.
- Jika PPR memerlukan perubahan lintas aplikasi yang tidak layak untuk scope ini, fallback streaming SSR + data cache diperbolehkan dengan alasan dan hasil pengujian yang dilaporkan.
- Tidak menjanjikan peningkatan ranking SEO dari pilihan rendering saja. Konten server-rendered, metadata, status/redirect dan kecepatan tetap wajib benar.

## Security dan konsistensi

- `requireUser`/`requirePermission` di server, bukan sekadar menyembunyikan menu.
- Zod pada input eksternal, version conflict protection, transaction dan audit mutation.
- Slug unik dan alias lama tidak boleh bertabrakan/diambil alih record lain.
- Published query mengecualikan draft, review, archived dan soft-deleted serta menghormati tanggal publikasi.
- Editor generic CMS tidak boleh menghapus rich content saat mengedit case study.

## Out of scope

Image upload/media storage baru, editor kolaboratif, permanent delete, microservices, otomatisasi CMS-to-RAG/embedding baru dan fitur Phase 2 lain. Penyesuaian tautan portfolio yang sudah ada tetap termasuk integrasi URL.

## Acceptance criteria

- UUID tersimpan; URL baru slug dan redirect lama tervalidasi.
- Admin authorized dapat CRUD, publish/schedule sesuai permission, archive dan restore ke draft.
- ID/EN rich content tersimpan dan dirender aman; overview tetap terstruktur.
- Tiga seed ilustratif tersedia; seed ulang tidak overwrite record yang diedit.
- Public list/detail/homepage dan SEO tidak memakai fallback contoh hardcoded.
- Cache refresh setelah edit/publish/archive/restore; record nonpublic tidak muncul di sitemap/public.
- Shell/data behavior diverifikasi pada production build; PPR atau fallback dinyatakan secara jujur.
- Typecheck/build, RBAC, konflik versi, URL, rich-content safety dan responsive diuji.

## Tracking

Keputusan dan kondisi aktual: [Portfolio architecture](../../features/portfolio.md).
Laporan Task 1: [Implementation report](../../reports/2026/10/04/portfolio_task1.md).
