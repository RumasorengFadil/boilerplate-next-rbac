# Instalasi dan clone

1. Buat repository baru dari folder boilerplate ini, lalu ganti `name` pada `package.json` dan identitas di `.env.local`.
2. Salin `.env.example` ke `.env.local`. Jangan commit `.env.local`.
3. Jalankan `npm install` dan siapkan PostgreSQL yang sesuai `DATABASE_URL`.
4. Jalankan `npm run db:migrate`, lalu `npm run dev`.
5. Sebelum deploy jalankan `npm run typecheck` dan `npm run build`.

Production memerlukan `DATABASE_URL` yang dapat dijangkau server aplikasi. `npm run build` menjalankan `prisma generate` sebelum `next build`; output Next.js dibuat standalone. Gunakan secret manager platform untuk semua variabel non-publik.
