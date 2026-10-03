# Next.js RBAC Boilerplate

Fondasi aplikasi Next.js untuk project baru yang memerlukan autentikasi berbasis session, kontrol akses per peran, dashboard, dan database PostgreSQL. Ia mengambil pola yang telah dipakai Bisadev—App Router, pemisahan domain `features`, provider, config, helper, layout dashboard—tanpa membawa identitas agensi, blog, chat, analytics, kontak WhatsApp, atau integrasi backend eksternal Bisadev.

## Memulai project baru

1. Salin folder ini ke repository baru dan ganti nama package di `package.json`.
2. Salin `.env.example` menjadi `.env.local`, lalu isi `DATABASE_URL`, `NEXT_PUBLIC_APP_NAME`, dan `NEXT_PUBLIC_APP_URL`.
3. Jalankan `npm ci` untuk memakai `package-lock.json` yang disertakan. Gunakan `npm install` hanya saat mengubah dependency.
4. Pastikan PostgreSQL tersedia, lalu jalankan `npm run db:migrate`.
5. Jalankan `npm run dev` dan buka `http://localhost:3000`.

Untuk deployment, jalankan `npm run build`; perintah ini menghasilkan Prisma Client sebelum build Next.js dan memakai output standalone.

## Yang sudah tersedia

- Next.js App Router dan TypeScript strict dengan alias `@/*`.
- PostgreSQL + Prisma: `User`, `Session`, dan `Project` beserta migrasi awal.
- Register, login, logout, password hashing bcrypt, opaque session token, cookie `HttpOnly`, `SameSite=Lax`, dan masa berlaku tujuh hari.
- Role `ADMIN` dan `MEMBER`; permission dibuat eksplisit di `src/lib/permissions.ts` dan diperiksa kembali pada layout/page/action server.
- Root provider TanStack Query dan Sonner, konfigurasi aplikasi terpusat, helper `cn`, serta Prisma singleton.
- Layout dashboard dengan navbar dan sidebar yang memfilter menu berdasarkan permission. Pada layar kecil, sidebar berubah menjadi navigasi horizontal yang dapat digeser dan setiap target memiliki tinggi minimal 44px.
- Modul `projects` sebagai contoh domain: schema Zod, server action, query database, form, dan batas akses pemilik/admin.

## Batasan yang perlu Anda putuskan

- Registrasi publik saat ini membuat `MEMBER`; buat undangan/admin provisioning jika pembuatan akun harus dibatasi.
- Proxy hanya membaca keberadaan cookie agar tetap ringan/edge-safe. Validasi session dan permission yang menentukan akses berada pada server layout, page, dan action.
- Tidak ada reset password, verifikasi email, audit log, rate limit, atau OAuth. Tambahkan sesuai kebutuhan produk dan dokumentasikan kontraknya.

Dokumentasi terperinci tersedia di [docs/README.md](docs/README.md). Audit sumber pemisahan core tersedia di [docs/BOOTSTRAP_AUDIT.md](docs/BOOTSTRAP_AUDIT.md).
