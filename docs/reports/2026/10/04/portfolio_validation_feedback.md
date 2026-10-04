# Implementation Report — Portfolio validation feedback

**Tanggal:** 2026-10-04

**Classification:** SMALL

**Status:** COMPLETED

## Rencana dan Tracking

- Current Task: perbaiki pesan validasi portfolio yang tidak ramah pengguna.
- Progress: pesan menyebut kolom/bahasa dan tampil inline dengan penanda aksesibel; syarat publikasi tidak berubah.
- Next Task: Task 5B cache/PPR dan Task 6 final QA tetap menunggu konfirmasi; tidak diimplementasikan pada perbaikan ini.

## Penyebab dan Perubahan

- Penyebab: rule publikasi menggabungkan body/excerpt pada path translations.id/en, lalu action menampilkan path teknis tersebut. Pengguna tidak mengetahui kolom mana yang perlu dilengkapi.
- Perubahan: schema menerbitkan issue body/excerpt terpisah; portfolio mapper mengubahnya menjadi pesan Bahasa Indonesia dan key form. Contoh: “Ringkasan Bahasa Inggris minimal 10 karakter untuk publikasi.” Body teks hasil Tiptap diarahkan ke editor richBody, bukan hidden plain field.
- Form menampilkan error dekat textarea/input/editor, border merah, aria-invalid/aria-describedby dan ringkasan pada status live. Hint minimal publikasi tampil sebelum submit. Teks tetap ada ketika gagal, dan success memuat ulang persisted form tanpa error. Error berlaku sampai validasi submit berikutnya, bukan real-time per keystroke.
- Minimum tetap 10 karakter excerpt dan 30 karakter teks body per bahasa untuk PUBLISHED/SCHEDULED. DRAFT/REVIEW tidak diberi batas publikasi. Allowlist/length/authorization/workflow/version/upload rules tidak dilonggarkan; tidak mengisi konten/terjemahan palsu otomatis.

## File Change

- Created: `tests/portfolio-validation.test.mjs` (kontrak pesan/field/bahasa) dan laporan ini.
- Modified: `src/features/cms/schema.ts` (granular issues), `actions.ts` (optional fieldErrors state), `editor.tsx` (inline feedback/hint), `rich-text-editor.tsx` (inline error/ARIA); `src/features/portfolio/schema.ts` (safe message mapper), `actions.ts` (friendly response); `tests/portfolio-cover-browser.mjs` (invalid publication UI/error recovery regression); `docs/features/portfolio.md` dan `docs/README.md` (living contract/index).
- Deleted: None.

## Database Change

None. Tidak ada tabel/kolom/index/constraint/migration atau perubahan data aplikasi. Fixtures/browser sessions hanya pada disposable PostgreSQL port 55441 dan dibersihkan setelah pengujian.

## Architecture Change

None. Boundary Zod dan server authorization tetap; optional `fieldErrors: Record<inputName, message>` menambah response state existing, tanpa endpoint baru. Mapper hanya menghasilkan copy editorial statis dan tidak menampilkan raw Zod message/path/input. Generic article/product action tetap existing; schema publikasi shared mendapatkan issue paths yang lebih spesifik dengan kriteria validasi sama.

## Verification

- `npm run lint`, `npm run typecheck`, `npm run build`: PASS.
- 14 tests CMS/portfolio schema, publication feedback, server actions dan cover validation/integration: PASS.
- Production browser QA: PASS — invalid publikasi kedua bahasa menampilkan empat pesan spesifik inline; aria-invalid/aria-describedby terhubung ke error; tidak ada translations.* di pesan; judul tetap tersimpan di form; tidak ada record baru saat gagal; error hilang sesudah save sukses. Upload/preview/keep/replace/remove/public/private dan responsive regression tetap PASS, zero pageerrors.
- `git diff --check`: PASS. Commit hanya perbaikan ini; AGENTS.md milik pengguna, env/secrets/generated/uploads tidak disertakan. Tidak push.
