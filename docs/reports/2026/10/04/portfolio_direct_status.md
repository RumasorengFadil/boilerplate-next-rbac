# Implementation Report — Portfolio direct status

**Tanggal:** 2026-10-04

**Classification:** SMALL

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: penerapan [PRD 006](../../../../products/PRD/PRD_006_portfolio-direct-status.md), pilihan status portfolio langsung untuk penggunaan pribadi.
- Progress: mandatory REVIEW dihapus khusus CASE_STUDY; archive tetap tombol/lifecycle soft delete existing, tidak menjadi opsi status.
- Next Task: Task 5B cache/PPR dan Task 6 final QA masih menunggu konfirmasi; tidak dikerjakan pada perubahan ini.

## Penyebab dan Perubahan

- Penyebab: DRAFT→PUBLISHED/SCHEDULED sebelumnya ditolak oleh shared transition guard. Pengguna memilih pengelolaan berdasarkan status, bukan workflow review wajib.
- Perubahan: service CASE_STUDY menerima create/update langsung DRAFT/REVIEW/PUBLISHED/SCHEDULED. ARTICLE/PRODUCT tetap menggunakan canTransition existing. Schema portfolio dan shared service menolak ordinary save ARCHIVED sehingga tidak ada jalur archive setengah jadi tanpa deletedAt.
- UI memakai label Status portfolio, tanpa ARCHIVED bahkan untuk legacy active record; copy tidak lagi memerintahkan REVIEW sebelum publikasi. Legacy ARCHIVED nondeleted tidak dimigrasikan massal; editor memilih DRAFT untuk save berikutnya atau operator memakai tombol Arsipkan existing.
- PUBLISHED langsung eligible setelah save, SCHEDULED eligible ketika timestamp UTC due (save memerlukan jadwal mendatang), DRAFT/REVIEW nonpublic dengan publishedAt null. Existing query predicate, slug/canonical/SEO/OG/sitemap/media eligibility dan invalidation tetap digunakan.
- Arsipkan tetap menyetel deletedAt/ARCHIVED dan memindahkan Aktif→Arsip; pulihkan kembali DRAFT. Tidak menghapus enum database, mengubah lifecycle controls atau menambah endpoint.
- ID/EN publication validation, RBAC, optimistic version, audit/transaction, UUID/slug reservations dan cover rules tetap berlaku. Tidak mempublish record pengguna otomatis.

## File Change

- Created: `docs/products/PRD/PRD_006_portfolio-direct-status.md` (snapshot sebelum implementasi), `tests/portfolio-status.test.mjs` (direct status/guards/publication regression), laporan ini.
- Modified: `src/features/cms/service.ts` (CASE_STUDY-specific guard), `src/features/cms/editor.tsx` (status select/copy/legacy default), `src/features/portfolio/schema.ts` (ARCHIVED rejection/friendly status error), `src/features/portfolio/actions.ts` (hapus nasihat mandatory REVIEW), `tests/portfolio-cover-browser.mjs` (direct status/sitemap/archive browser assertions), `docs/features/portfolio.md`, `docs/features/phase2.md`, `docs/database/schema.md`, `docs/README.md` (aktualisasi perilaku/index).
- Deleted / Move / Rename: None.

## Database Change

None untuk tabel, kolom, index, constraint, migration atau data existing. Enum ARCHIVED dan deletedAt tetap digunakan lifecycle. Pengujian menulis synthetic fixtures hanya pada disposable `lunabiner_portfolio_test` port 55441, kemudian cleanup. Database utama tidak dimutasi.

## Architecture Change

None. Existing feature/service/Server Action boundaries tetap; aturan transition dibedakan berdasarkan kind, tidak menggunakan client flag yang dapat mematikan workflow artikel/produk. Arsip tetap action terotorisasi dan transactional dengan version/audit.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`: PASS.
- 17 Node tests: PASS, termasuk create semua status aktif, 16 kombinasi perpindahan, due schedule/sitemap, stale versions, publisher guard, ordinary ARCHIVED rejection, archive/restore, direct publication setelah restore, seed/routes/rich preservation serta artikel/produk tetap wajib REVIEW.
- Production browser: PASS — opsi hanya DRAFT/REVIEW/SCHEDULED/PUBLISHED; DRAFT→PUBLISHED tanpa REVIEW, PUBLISHED→DRAFT, DRAFT→SCHEDULED future→PUBLISHED langsung; public detail/sitemap sesuai status. Tombol existing Arsipkan menghilangkan item dari Aktif, menampilkannya di Arsip; Pulihkan mengembalikan aktif sebagai DRAFT, tetap nonpublic. Friendly errors/upload/private media/desktop/mobile tetap lolos, zero pageerrors.
- `git diff --check`: PASS. Changes pengguna pada AGENTS.md dan generated next-env.d.ts tidak disertakan commit; secrets/assets/backup tetap excluded. Commit focused tanpa push.
