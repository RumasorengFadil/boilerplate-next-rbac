# Implementation Report — Portfolio Prisma runtime fix

**Tanggal:** 2026-10-04

**Classification:** SMALL

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: perbaikan runtime `/id/work` sebelum Task 4.
- Progress: error direproduksi, penyebab diverifikasi dan dev server dipulihkan.
- Next Task: Task 4 Portfolio public, hanya setelah konfirmasi pengguna.

## Penyebab dan Perubahan

- Sebelum perbaikan: `/id/work` HTTP 500, PrismaClientValidationError dan Unknown argument deletedAt.
- Schema/generated client di disk sudah memiliki deletedAt/PortfolioRoute. Database lokal menunjukkan migration portfolio foundation applied dan query count dengan deletedAt berhasil (3 published CASE_STUDY).
- Next dev port 3000 masih berjalan sejak 2026-10-03 sebelum foundation migration; imported Prisma runtime dalam worker masih memakai datamodel lama. Cache fingerprint bukan reload terhadap modul Prisma yang sudah di-import.
- Regenerate Prisma Client 6.19.3, hentikan CLI Next dev yang teridentifikasi pada cwd proyek ini secara graceful, lalu jalankan kembali `npm run dev -- --hostname 127.0.0.1 --port 3000`.
- Filter soft-delete tidak dihapus. Tidak ada schema/code workaround, reset database, penghapusan asset/cache atau node_modules. Server dev pengganti tetap berjalan agar halaman bisa diakses pengguna.

## File Change

Created:

- `docs/reports/2026/10/04/portfolio_prisma_runtime_fix.md`

Modified:

- `docs/deployment/installation.md`
- `docs/README.md`

Deleted: None

## Database Change

None. Hanya pemeriksaan read-only migration/query; tidak menjalankan seed atau mutation database dalam perbaikan ini.

## Architecture Change

None. Dokumentasi menjelaskan perbedaan stale Prisma module, cache instance, dan missing database migration. User changes AGENTS.md/public work detail dipertahankan dan tidak disertakan commit.

## Verification

- `npm run db:generate`: PASS.
- `node --test tests/prisma-client-cache.test.mjs`: 3/3 PASS.
- `npm run typecheck`: PASS.
- HTTP `/id/work` dan `/en/work`: 200, portfolio rendered, tanpa PrismaClientValidationError atau Unknown argument deletedAt.
- `npm run build`: PASS.
- Task 4–6 tidak diimplementasikan pada perbaikan ini.
