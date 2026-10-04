# Portfolio Tiptap single source — Task 1

**Tanggal:** 2026-10-04

**Classification:** MEDIUM

**Status:** COMPLETED (Task 1 saja; keseluruhan refinement belum selesai)

## Rencana dan Tracking

- Current Task: Task 1 — konverter legacy dan preview migrasi read-only.
- Progress: Konverter tervalidasi, 12 tes lolos dan tiga record lokal dapat dikonversi. Tidak ada data database yang dimigrasikan/dihapus.
- Next Task: Task 2 runtime integration (editor/public/save/seed/SEO), kemudian Task 3 backup/apply/QA. Menunggu konfirmasi pengguna; public slug/PPR PRD 003 tetap terpisah.

## Penyebab dan Perubahan

- Penyebab: Pengguna ingin seluruh narasi detail diedit melalui Tiptap dan representasi database yang tidak dipakai dihapus, bukan hanya panel admin.
- Perubahan: PRD 004 mengarsipkan refinement tanpa mengubah PRD 003. Pure converter mempertahankan rich formatting/plain introduction/SEO ID/EN, menambahkan nilai legacy yang belum tercakup, kemudian menghasilkan details tanpa sepuluh key target.
- Key target: industry, challenge, approach, solution, impact, before, after, architecture, capabilities, technology. Ini key JSON, bukan kolom SQL terpisah.
- Pembandingan teks menggunakan NFC/whitespace dan batas whitespace. Tidak menebak kesamaan semantik; teks admin berbeda tetap utuh dan legacy berbeda ditambahkan untuk review editorial. List values identik tidak digandakan.
- Batas node/depth/text dan allowlist existing diperiksa; invalid/oversized conversion gagal tanpa mutasi sumber. Repeat conversion idempotent.
- CLI preview memakai PostgreSQL READ ONLY/RepeatableRead, tanpa apply flag, dump konten atau log kredensial. Meliputi CASE_STUDY semua status termasuk deleted; ARTICLE/PRODUCT tidak diproses.

## File Change

- Created: `docs/products/PRD/PRD_004_portfolio-tiptap-single-source.md`, `src/features/portfolio/legacy-content.ts`, `scripts/preview-portfolio-content.mjs`, `tests/portfolio-legacy-content.test.mjs`, laporan ini.
- Modified: `package.json` (preview command), `docs/features/portfolio.md`, `docs/README.md`.
- Deleted: None.
- Move/Rename: None.

## Database Change

None pada Task 1. Preview lokal: 3 rows, 3 with legacy keys, 3 convertible changes, 0 invalid rows. Tidak ada writes atau penghapusan. Cleanup aktual menunggu backup dan runtime integration; kolom details/tabel/UUID/status/route constraints tetap utuh.

## Architecture Change

Utility murni di feature portfolio memisahkan konversi dari persistence dan renderer; belum dipasang pada runtime. CLI menggunakan loader operasional existing (bukan test auth mocks). Tidak ada API endpoint, authorization, shared cache atau strategi rendering yang berubah.

## Verification

- `node --import ./scripts/typescript-loader.mjs --test tests/cms.test.mjs tests/portfolio.test.mjs tests/portfolio-legacy-content.test.mjs tests/permissions.test.mjs`: 12/12 PASS.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS, Next 16.3.8 webpack.
- `npm run db:preview:portfolio-content`: PASS read-only pada database lokal, tanpa menampilkan data private.
- Tidak ada UI change sehingga browser screenshot baru tidak diperlukan di Task 1. Desktop/mobile public rich rendering tetap diverifikasi di task berikutnya.
- Perubahan pengguna di AGENTS.md dan public work detail tidak disentuh atau dimasukkan commit. Tidak ada LLM/embedding calls dan tidak ada push.
