# Extract reusable Next.js RBAC boilerplate

## Summary
Membuat boilerplate mandiri pada folder terpisah berdasarkan pola aktif Bisadev, setelah memisahkan reusable core dari domain/integrasi spesifik.

## Files Changed
- `boilerplate-next-rbac/` — aplikasi template, konfigurasi, schema/migrasi, dokumentasi, dan audit.

## Database Changes
- Menambah schema PostgreSQL template: `User`, `Session`, `Project`, role enum, index, foreign key cascade, dan migrasi awal.

## API Changes
- Menambah route handler template `POST /api/auth/login`, `register`, dan `logout`.

## Architecture Changes
- None pada Bisadev. Boilerplate mandiri memakai App Router, feature modules, guard server-side, dan Prisma.

## Documentation Updated
- `README.md`, audit, architecture, database, security, deployment, feature example, dan governance boilerplate.

## Tests Performed
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS; skrip memakai Webpack agar build dapat berjalan pada host yang membatasi proses internal Turbopack. Rute statis/dinamis dan proxy berhasil dikompilasi.

## Manual Test
- NOT TESTED: alur register/login/proyek memerlukan PostgreSQL lokal yang belum disediakan untuk pemeriksaan ini.

## Known Limitations
- Reset password, email verification, OAuth, rate limiting, dan audit log belum disediakan.
