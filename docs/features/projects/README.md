# Module contoh: Projects

Module ini memperlihatkan pola minimum untuk domain baru:

- `src/features/projects/schema.ts` memvalidasi input `name` dan `description`.
- `src/features/projects/actions.ts` memanggil permission guard, membuat data, lalu merevalidasi halaman.
- `src/app/(dashboard)/dashboard/projects/page.tsx` melakukan query server dan menerapkan scope: admin melihat semua proyek, member hanya miliknya.

Saat menambah domain, buat folder `features/<domain>`, letakkan schema/action/hook/tipe yang dimilikinya di sana, lalu dokumentasikan kontrak dan aksesnya. Jangan memberikan akses cukup dengan menyembunyikan menu.
