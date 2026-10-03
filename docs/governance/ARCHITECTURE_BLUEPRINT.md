# Architecture Blueprint

Dokumen ini adalah referensi portable untuk memulai aplikasi Next.js yang punya area publik, autentikasi, data relasional, dan dashboard. Ia tidak mendefinisikan domain produk, nama role produk, atau aturan bisnis.

- Gunakan App Router dan route group untuk memisahkan public, auth, dan area terlindungi.
- Pisahkan domain ke feature modules; simpan infrastruktur bersama dalam `lib`, guard di `server`, dan provider di `context/providers`.
- Validasi input di boundary dengan schema. Jalankan otorisasi di server sebelum membaca atau menulis data.
- Jadikan permission sebagai daftar kemampuan eksplisit. UI boleh memfilter navigasi, tetapi tidak menjadi sumber keamanan.
- Gunakan migrasi versioned untuk database, singleton client pada development, serta dokumentasi schema/index/constraint.
- Simpan config non-secret yang dipakai UI di config module; kredensial tetap server-only dan tidak berawalan `NEXT_PUBLIC_`.
- Pertahankan satu sumber dokumentasi tiap fakta dan buat report bertanggal untuk perubahan signifikan.
