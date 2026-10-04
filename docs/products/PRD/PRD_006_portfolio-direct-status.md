# PRD 006 — Portfolio direct status

Tanggal: 2026-10-04. Refinement disetujui pengguna untuk pengelolaan portfolio pribadi, menggantikan kewajiban transisi REVIEW pada CASE_STUDY saja.

- Portfolio aktif dapat dibuat/diubah langsung menjadi DRAFT, REVIEW, PUBLISHED atau SCHEDULED, tanpa urutan wajib.
- DRAFT/REVIEW tidak tampil public, detail/metadata/OG public, sitemap atau thumbnail anonymous.
- PUBLISHED langsung terbit saat save sukses. SCHEDULED tampil berdasarkan tanggal/waktu UTC yang ditentukan; save schedule memerlukan waktu mendatang.
- ARCHIVED bukan opsi status editor. Tombol Arsip existing menyetel soft delete dan memindahkan aktif→Arsip; pulihkan tetap DRAFT. Tidak menambah fitur/endpoint arsip atau menghapus enum database.
- Validasi ID/EN, izin content:write/content:publish, UUID/slug, version guards, audit, cover ownership dan publikasi shared tetap dipertahankan.
- Artikel/produk tetap menggunakan workflow REVIEW existing. Tidak mengaktifkan PPR/cache atau fitur luar scope.
- Tidak ada migrasi/bulk update data existing; status tersimpan berubah hanya saat pengguna menyimpan atau memakai lifecycle existing.
