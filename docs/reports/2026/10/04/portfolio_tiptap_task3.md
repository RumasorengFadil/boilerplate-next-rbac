# Portfolio Tiptap single source — Task 3

**Tanggal:** 2026-10-04

**Classification:** MEDIUM

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: PRD 004 Task 3 — private backup, atomic migration/cleanup dan recovery QA.
- Progress: Ketiga portfolio database lokal lunabiner telah dikonversi ke Tiptap ID/EN; sepuluh key legacy dibuang, repeat migration no-op dan backup recovery tersedia.
- Next Task: PRD 004 Task 1–3 selesai. PRD 003 canonical slug/redirect dan DB-only fallback removal (sisa Task 4), cache/PPR (Task 5), final QA (Task 6) masih tersisa dan tidak dimulai otomatis.

## Penyebab dan Perubahan

- Penyebab: Pengguna meminta narasi hanya melalui Tiptap dan representasi database yang sudah tidak dipakai dihapus.
- CLI baru db:migrate:portfolio-content menerima tepat satu operasi --apply/--restore dan explicit --database; hanya loopback PostgreSQL. Environment memakai Next precedence, target database/schema aktual diperiksa, unknown arguments dan mismatch ditolak.
- Apply memvalidasi semua CASE_STUDY dan membuat snapshot before/after sebelum writes. Backup exclusive-create 0600, directory 0700, fsync file/directory, read-back equality/manifest validation. Batas 10 MB/10.000 changed rows mencegah backup tidak dapat dipulihkan. File berisi konten private tetapi tidak credential; tidak dikirim ke provider/Git.
- Transaksi Serializable + advisory lock + optimistic version menjadikan backup failure, invalid content dan concurrent edit sebagai rollback atomik. No auto-retry. Backup yang sudah tertulis tetap dipertahankan bila DB rollback.
- Restore tervalidasi dan target-bound host/port/database/schema; hanya JSON before, version bertambah, audit transactional. Newer version, unmatched current JSON atau operasi restore ulang ditolak tanpa overwrite parsial; workflow/UUID/routes tidak dipulihkan/diubah.
- Perbandingan JSON kini structural: urutan key JSONB bukan perubahan, tetapi urutan array tetap signifikan. Ini memastikan repeat apply benar-benar tidak menulis ulang atau membuat audit/version/backup baru.

## File Change

- Created: `src/features/portfolio/content-migration.ts`, `scripts/migrate-portfolio-content.mjs`, `tests/portfolio-content-migration.test.mjs`, laporan ini.
- Modified: `src/features/portfolio/legacy-content.ts`, `package.json`, `.gitignore`, `docs/features/portfolio.md`, `docs/features/phase2.md`, `docs/database/schema.md`, `docs/deployment/installation.md`, `docs/README.md`.
- Generated private (ignored): `.local-backups/portfolio-content/f5223b97-3cc5-475b-bcbb-ffeb2ec920b1.json`.
- Deleted: None untuk file/data record. Sepuluh key legacy dibuang dari tiga record setelah isinya terwakili richBody. Backup tetap tersimpan agar dapat dipulihkan.
- Move/Rename: None.

## Database Change

- Target lokal: lunabiner. Batch UUID: f5223b97-3cc5-475b-bcbb-ffeb2ec920b1.
- ContentEntry: 3 CASE_STUDY scanned/migrated; translations ID/EN menyimpan richBody dan derived body; details tidak lagi memiliki industry, challenge, approach, solution, impact, before, after, architecture, capabilities, technology. Metadata non-narasi tetap ada. Version +1 dan updatedAt mengikuti mutation.
- UUID/slug/kind/status/publishedAt/deletedAt/author/createdAt dan PortfolioRoute reservations dipertahankan. ARTICLE/PRODUCT tidak dimigrasikan. Tidak ada DROP COLUMN details, tabel/index/constraint baru atau Prisma SQL migration baru; ini versioned operational data migration.
- AuditEvent: 3 portfolio.content.migrate, module cms, actorId null, recordId UUID, before/after version dan batchId. Tidak menyimpan body/credential.
- Post-apply preview: 3 rows, 0 legacy keys, 0 changes, 0 invalid. Repeat apply: 3 scanned, 0 migrated. Stored JSON/version cocok dengan backup after; kedua bahasa memiliki richBody.
- Backup privat 0600 dan diabaikan Git, belum dihapus. Recovery CLI diuji pada database disposable saja; restore tidak dijalankan pada data utama.

## Architecture Change

CLI operasional memakai authority database role operator, bukan public API/Server Action; schema boundaries memvalidasi target/backup. Tidak ada perluasan auth, route, rendering strategy, shared cache atau provider integration. Runtime adapter/save/renderer Task 2 tetap digunakan. [Installation](../../../../deployment/installation.md) menjelaskan upgrade/restore dan kewajiban reopen form sesudah version berubah.

## Verification

- Typecheck/lint/build: PASS, Next 16.3.8 webpack.
- Pure CMS/portfolio/legacy/permissions: 12/12 PASS.
- Serial DB/render/SEO/actions/persistence suite: 21 PASS; migration suite final: 4 PASS. Total 37 tests PASS (regression run gabungan sebelumnya 24 PASS sebelum penambahan CLI backup/restore subtest; final migration suite dijalankan ulang 4 PASS).
- Migration QA disposable mencakup draft/archived/deleted/scheduled, ARTICLE/PRODUCT unchanged, immutable metadata/routes, backup/invalid-row rollback, concurrent editor writes, structural idempotency setelah JSONB persistence, no-op tanpa backup/audit, target mismatch/tampered manifest, stale restore atomik, successful restore dan reapply.
- CLI nyata pada disposable berhasil create/fsync/read-back backup 0600 dan restore; hanya fixture backup/data dibersihkan. Database utama dimigrasikan sesudah semua safety checks lolos.
- Read-only Chrome QA main database: ID/EN /work/2 HTTP 200, satu H1, rich content dengan capabilities terbaca, desktop/mobile tanpa document overflow. Screenshot diperiksa di `/private/tmp/lunabiner-portfolio-migrated-qa-PSvwgl`; tidak di-commit. Logo/teal/orange, typography dan layout existing tetap.
- `git check-ignore` memastikan private backup tidak masuk Git. Perubahan pengguna AGENTS.md/public work detail tetap tidak disentuh atau di-commit. Tidak ada credentials/LLM/embedding calls, reset database atau push.

## Review

Muat ulang editor admin sebelum melanjutkan menulis: migration menaikkan version agar form lama tidak menimpa data hasil konversi. Seluruh refinement PRD 004 selesai lokal; bukan klaim seluruh PRD 003 (slug/PPR) atau produksi sudah selesai.
