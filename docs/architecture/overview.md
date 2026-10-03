# Arsitektur

`src/app/` memakai App Router: `(public)` untuk halaman terbuka, `(auth)` untuk login/register, dan `(dashboard)` untuk area terlindungi. Halaman server membaca database secara langsung; komponen interaktif diberi `"use client"` dan diletakkan sedekat mungkin dengan UI yang memerlukannya.

`src/features/` memegang domain. `src/lib/` adalah infrastruktur lintas domain (database, session, permission, helper). `src/server/` menyediakan guard otorisasi. `src/context/providers/` menampung provider global. Root layout memasang query client dan toast.

Alur akses: proxy mengecek cookie untuk redirect cepat → dashboard layout menjalankan `requireUser` → page/action yang butuh kemampuan tertentu menjalankan `requirePermission` → fungsi akses database menjalankan query dengan scope user bila diperlukan. Jangan hilangkan tahap terakhir: role admin dan member mempunyai scope proyek berbeda.
