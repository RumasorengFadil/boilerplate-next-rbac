# Database

Prisma menggunakan PostgreSQL dan schema berada di `prisma/schema.prisma`.

| Tabel | Kolom/constraint utama | Index |
|---|---|---|
| `User` | `id` PK, `email` unique, `passwordHash`, `role` | unique `email` |
| `Session` | `id` PK, `tokenHash` unique, FK `userId` cascade, `expiresAt` | `userId`, `expiresAt` |
| `Project` | `id` PK, FK `ownerId` cascade, `name`, `description` | `ownerId` |

Migrasi awal ada di `prisma/migrations/20261003000000_init/migration.sql`. Gunakan `npm run db:migrate` di development. Untuk perubahan schema baru, buat migrasi Prisma, review SQL-nya, lalu perbarui tabel ini dan laporan implementasi.
